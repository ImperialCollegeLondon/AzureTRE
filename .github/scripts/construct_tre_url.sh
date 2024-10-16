#!/bin/bash

# Construct the TRE URL for the delete endpoint
TRE_URL="https://$TRE_ID.$LOCATION.cloudapp.azure.com/api"

# Ensure the script correctly constructs the URL for the delete endpoint
DELETE_ENDPOINT="$TRE_URL/workspaces/$WORKSPACE_ID/requests/$AIRLOCK_REQUEST_ID"

# Update the script to include the necessary parameters for the delete request
echo "DELETE_ENDPOINT=$DELETE_ENDPOINT" >> $GITHUB_ENV