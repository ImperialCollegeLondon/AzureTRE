import React, { useEffect, useState } from 'react';
import { AnimationClassNames, Callout, IconButton, FontWeights, Stack, DirectionalHint, Text, Link, getTheme, mergeStyles, mergeStyleSets, StackItem, IButtonStyles } from '@fluentui/react';
import { HttpMethod, useAuthApiCall } from '../../hooks/useAuthApiCall';
import { ApiEndpoint } from '../../models/apiEndpoints';
import config from "../../config.json";

// TODO:
// - change text to link
// - include any small print

export const Footer: React.FunctionComponent = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [apiMetadata, setApiMetadata] = useState<any>();
  const [health, setHealth] = useState<{ services: [{ service: string, status: string }] }>();
  const apiCall = useAuthApiCall();

  useEffect(() => {
    const getMeta = async () => {
      const result = await apiCall(ApiEndpoint.Metadata, HttpMethod.Get);
      setApiMetadata(result);
    };
    const getHealth = async () => {
      const result = await apiCall(ApiEndpoint.Health, HttpMethod.Get);
      setHealth(result);
    };
    getMeta();
    getHealth();
  }, [apiCall]);

  const uiConfig = config as any;

  return (
    <div className={contentClass}>
      <Stack horizontal style={{ alignItems: 'center' }}>
        <StackItem grow={1}>Azure Trusted Research Environment</StackItem>
        <StackItem>
          <IconButton
            styles={iconButtonStyles}
            iconProps={{ iconName: 'FeedbackRequestSolid' }}
            id="support"
            ariaLabel="support"
            ariaDescription="support-description"
            onClick={() => setShowSupport(!showSupport)}
          />
          <IconButton
            styles={iconButtonStyles}
            iconProps={{ iconName: 'Info' }}
            id="info"
            ariaLabel="info"
            ariaDescription="info-description"
            onClick={() => setShowInfo(!showInfo)}
          />
        </StackItem>
      </Stack>
      {
        showInfo && <Callout
          className={styles.callout}
          ariaLabelledBy="info-label"
          ariaDescribedBy="info-description"
          role="dialog"
          gapSpace={0}
          target="#info"
          onDismiss={() => setShowInfo(false)}
          directionalHint={DirectionalHint.topAutoEdge}
          setInitialFocus
        >
          <Text block variant="xLarge" className={styles.title} id="info-label">
            Azure TRE
          </Text>
          <Stack tokens={{ childrenGap: 5 }}>
            {
              uiConfig.version && <Stack horizontal horizontalAlign='space-between'>
                <Stack.Item>UI Version:</Stack.Item>
                <Stack.Item>{uiConfig.version}</Stack.Item>
              </Stack>
            }
            {
              apiMetadata?.api_version && <Stack horizontal horizontalAlign='space-between'>
                <Stack.Item>API Version:</Stack.Item>
                <Stack.Item>{apiMetadata.api_version}</Stack.Item>
              </Stack>
            }
          </Stack>
          <Stack tokens={{ childrenGap: 5 }} style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e8e8e8' }}>
            {
              health?.services.map(s => {
                return <Stack horizontal horizontalAlign='space-between' key={s.service}>
                  <Stack.Item>{s.service}:</Stack.Item>
                  <Stack.Item>{s.status}</Stack.Item>
                </Stack>
              })
            }
          </Stack>
        </Callout>
      }
      {
        showSupport && <Callout
          className={styles.callout}
          ariaLabel="support"
          ariaLabelledBy="support-label"
          ariaDescribedBy="support-description"
          role="dialog"
          gapSpace={0}
          target="#support"
          onDismiss={() => setShowSupport(false)}
          directionalHint={DirectionalHint.topAutoEdge}
          setInitialFocus
        >
          <Text block variant="xLarge" className={styles.title} id="support-label">
            Support
          </Text>
          <Text block variant="smallPlus" id="support-text">
            If you would like to raise a question, require further assistance, or would like to leave feedback, please contact TRE Support
          </Text>
          <Link href="https://servicemgt.service-now.com/ask?id=sc_cat_item&sys_id=fe972e1c1b184a10557837b5464bcbcf" target="_blank" className={styles.link} id="support-link">
            Contact Here
          </Link>
        </Callout>
      }
    </div>
  );
};

const theme = getTheme();
const contentClass = mergeStyles([
  {
    alignItems: 'center',
    // backgroundColor: theme.palette.themeDark,
    backgroundColor: '#0000CD',
    color: theme.palette.white,
    lineHeight: '25px',
    padding: '0 20px',
  },
  AnimationClassNames.scaleUpIn100
]);

const iconButtonStyles: Partial<IButtonStyles> = {
  root: {
    color: theme.palette.white,
  },
  rootHovered: {
    color: theme.palette.neutralDark,
  },
};

const styles = mergeStyleSets({
  callout: {
    width: 250,
    padding: '20px 24px',
  },
  title: {
    marginBottom: 12,
    fontWeight: FontWeights.semilight
  },
  link: {
    display: 'block',
    marginTop: 20,
  }
});
