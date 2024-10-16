from distutils.util import strtobool
import logging
import datetime
import uuid
import json
import re
import os

import azure.functions as func

from shared_code import constants
from shared_code.blob_operations import get_blob_info_from_topic_and_subject, get_blob_client_from_blob_info, get_blob_info_from_blob_url
from azure.storage.blob import BlobServiceClient


def main(msg: func.ServiceBusMessage,
         stepResultEvent: func.Out[func.EventGridOutputEvent],
         dataDeletionEvent: func.Out[func.EventGridOutputEvent]):

    logging.info("Python ServiceBus topic trigger processed message - A new blob was created!.")
    body = msg.get_body().decode('utf-8')
    logging.info('Python ServiceBus queue trigger processed message: %s', body)

    json_body = json.loads(body)
    topic = json_body["topic"]
    request_id = re.search(r'/blobServices/default/containers/(.*?)/blobs', json_body["subject"]).group(1)

    # message originated from in-progress blob creation
    if constants.STORAGE_ACCOUNT_NAME_IMPORT_INPROGRESS in topic or constants.STORAGE_ACCOUNT_NAME_EXPORT_INPROGRESS in topic:
        try:
            enable_malware_scanning = strtobool(os.environ["ENABLE_MALWARE_SCANNING"])
        except KeyError:
            logging.error("environment variable 'ENABLE_MALWARE_SCANNING' does not exists. Cannot continue.")
            raise

        if enable_malware_scanning and constants.STORAGE_ACCOUNT_NAME_IMPORT_INPROGRESS in topic:
            # If malware scanning is enabled, the fact that the blob was created can be dismissed.
            # It will be consumed by the malware scanning service
            logging.info('Malware scanning is enabled. no action to perform.')
            send_delete_event(dataDeletionEvent, json_body, request_id)
            return
        else:
            logging.info('Malware scanning is disabled. Completing the submitted stage (moving to in_review).')
            # Malware scanning is disabled, so we skip to the in_review stage
            completed_step = constants.STAGE_SUBMITTED
            new_status = constants.STAGE_IN_REVIEW

    # blob created in the approved storage, meaning its ready (success)
    elif constants.STORAGE_ACCOUNT_NAME_IMPORT_APPROVED in topic or constants.STORAGE_ACCOUNT_NAME_EXPORT_APPROVED in topic:
        completed_step = constants.STAGE_APPROVAL_INPROGRESS
        new_status = constants.STAGE_APPROVED
    # blob created in the rejected storage, meaning its ready (declined)
    elif constants.STORAGE_ACCOUNT_NAME_IMPORT_REJECTED in topic or constants.STORAGE_ACCOUNT_NAME_EXPORT_REJECTED in topic:
        completed_step = constants.STAGE_REJECTION_INPROGRESS
        new_status = constants.STAGE_REJECTED
    # blob created in the blocked storage, meaning its ready (failed)
    elif constants.STORAGE_ACCOUNT_NAME_IMPORT_BLOCKED in topic or constants.STORAGE_ACCOUNT_NAME_EXPORT_BLOCKED in topic:
        completed_step = constants.STAGE_BLOCKING_INPROGRESS
        new_status = constants.STAGE_BLOCKED_BY_SCAN

    # reply with a step completed event
    stepResultEvent.set(
        func.EventGridOutputEvent(
            id=str(uuid.uuid4()),
            data={"completed_step": completed_step, "new_status": new_status, "request_id": request_id},
            subject=request_id,
            event_type="Airlock.StepResult",
            event_time=datetime.datetime.utcnow(),
            data_version=constants.STEP_RESULT_EVENT_DATA_VERSION))

    send_delete_event(dataDeletionEvent, json_body, request_id)


def send_delete_event(dataDeletionEvent: func.Out[func.EventGridOutputEvent], json_body, request_id):
    # check blob metadata to find the blob it was copied from
    blob_client = get_blob_client_from_blob_info(
        *get_blob_info_from_topic_and_subject(topic=json_body["topic"], subject=json_body["subject"]))
    blob_metadata = blob_client.get_blob_properties()["metadata"]
    copied_from = json.loads(blob_metadata["copied_from"])
    logging.info(f"copied from history: {copied_from}")

    # signal that the container where we copied from can now be deleted
    dataDeletionEvent.set(
        func.EventGridOutputEvent(
            id=str(uuid.uuid4()),
            data={"blob_to_delete": copied_from[-1]},  # last container in copied_from is the one we just copied from
            subject=request_id,
            event_type="Airlock.DataDeletion",
            event_time=datetime.datetime.utcnow(),
            data_version=constants.DATA_DELETION_EVENT_DATA_VERSION
        )
    )

def handle_delete_event(blob_url: str):
    storage_account_name, container_name, blob_name = get_blob_info_from_blob_url(blob_url=blob_url)
    credential = get_credential()
    blob_service_client = BlobServiceClient(
        account_url=get_account_url(storage_account_name),
        credential=credential)
    container_client = blob_service_client.get_container_client(container_name)

    if not blob_name:
        logging.info(f'No specific blob specified, deleting the entire container: {container_name}')
        container_client.delete_container()
        return

    # If it's the only blob in the container, we need to delete the container too
    # Check how many blobs are in the container (note: this exhausts the generator)
    blobs_num = sum(1 for _ in container_client.list_blobs())
    logging.info(f'Found {blobs_num} blobs in the container')

    # Deleting blob
    logging.info(f'Deleting blob {blob_name}...')
    blob_client = container_client.get_blob_client(blob_name)
    blob_client.delete_blob()

    if blobs_num == 1:
        # Need to delete the container too
        logging.info(f'There was one blob in the container. Deleting container {container_name}...')
        container_client.delete_container()