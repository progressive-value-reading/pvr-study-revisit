import {
  Modal, Text, Title, Stack, List,
  Card,
  Flex,
} from '@mantine/core';
import {
  IconAlertTriangle, IconBrowser, IconDevices, IconHandClick, IconDeviceDesktop,
} from '@tabler/icons-react';
import { useStudyConfig } from '../../store/hooks/useStudyConfig';
import { useDeviceRules } from '../../utils/useDeviceRules';

export function DeviceWarning({
  developmentModeEnabled,
}: {
  developmentModeEnabled?: boolean
}) {
  const studyConfig = useStudyConfig();

  const {
    browsers, devices, inputs, display,
  } = studyConfig.studyRules ?? {};
  const displayRules = [
    display?.minWidth !== undefined ? `Minimum width: ${display.minWidth}px` : undefined,
    display?.minHeight !== undefined ? `Minimum height: ${display.minHeight}px` : undefined,
    display?.maxWidth !== undefined ? `Maximum width: ${display.maxWidth}px` : undefined,
    display?.maxHeight !== undefined ? `Maximum height: ${display.maxHeight}px` : undefined,
  ].filter((rule): rule is string => rule !== undefined);

  const {
    isBrowserAllowed,
    isDeviceAllowed,
    isInputAllowed,
    isDisplayAllowed,
    currentBrowser,
    currentDevice,
    currentInputs,
    currentDisplay,
  } = useDeviceRules(studyConfig.studyRules);
  const hasAnyViolation = !isBrowserAllowed || !isDeviceAllowed || !isInputAllowed || !isDisplayAllowed;
  const violatedSettings = [
    !isBrowserAllowed ? 'Browser' : null,
    !isDeviceAllowed ? 'Device' : null,
    !isInputAllowed ? 'Input' : null,
    !isDisplayAllowed ? 'Display' : null,
  ].filter((setting): setting is string => setting !== null);
  const warningTitle = violatedSettings.length > 0
    ? `${violatedSettings.join(', ')} Requirement${violatedSettings.length > 1 ? 's' : ''} Not Met`
    : 'Device Requirement Not Met';
  const isDisplayRequirementNotMet = !isDisplayAllowed && (
    (display?.minWidth !== undefined && currentDisplay.width < display.minWidth)
    || (display?.minHeight !== undefined && currentDisplay.height < display.minHeight)
  );

  if (developmentModeEnabled || !hasAnyViolation) {
    return null;
  }

  return (
    <Modal opened onClose={() => {}} fullScreen withCloseButton={false}>
      <Stack align="center" justify="center">
        <IconAlertTriangle size={64} color="orange" />
        <Title order={3}>{warningTitle}</Title>
        {isDisplayRequirementNotMet && (
          <Text size="md" ta="center" maw={560}>
            Your display does not meet the minimum size for this study. Resize your browser
            window or switch to a supported device to continue. You cannot proceed until
            the display requirement is met.
          </Text>
        )}
        <Flex wrap="wrap" justify="center">
          {!isBrowserAllowed && (
          <Card shadow="sm" padding="lg" radius="md" mx="md" my="md" withBorder w={400}>
            <Card.Section bg="gray.3" mb="md" p="md" style={{ display: 'flex', justifyContent: 'center' }}>
              <IconBrowser size={48} color="gray" />
            </Card.Section>
            {browsers?.blockedMessage
              ? (
                <>
                  <Text size="md" c="red" mb="xs">
                    {browsers.blockedMessage}
                  </Text>
                  <Text size="md" c="red" mb="xs">
                    Current browser:
                    {' '}
                    {currentBrowser.name}
                    {currentBrowser.version ? ` v${currentBrowser.version}` : ''}
                  </Text>
                </>
              ) : (
                <>
                  <Text size="md" c="red" mb="xs">
                    Your browser is not compatible with the study.
                    Current browser:
                    {' '}
                    {currentBrowser.name}
                    {currentBrowser.version ? ` v${currentBrowser.version}` : ''}
                  </Text>
                  <Text size="md">
                    This study only works in the following browser(s):
                  </Text>
                  <List ml="md">
                    {browsers?.allowed.map((browser, idx) => (
                      <List.Item key={idx}>
                        {browser.name}
                        {browser.minVersion && ` v${browser.minVersion} or later`}
                      </List.Item>
                    ))}
                  </List>
                </>
              )}
          </Card>
          )}

          {!isDeviceAllowed && (
          <Card shadow="sm" padding="lg" radius="md" mx="md" my="md" withBorder w={400}>
            <Card.Section bg="gray.3" mb="md" p="md" style={{ display: 'flex', justifyContent: 'center' }}>
              <IconDevices size={48} color="gray" />
            </Card.Section>
            {devices?.blockedMessage
              ? (
                <>
                  <Text size="md" c="red" mb="xs">
                    {devices.blockedMessage}
                  </Text>
                  <Text size="md" c="red" mb="xs">
                    Current device:
                    {' '}
                    {currentDevice}
                  </Text>
                </>
              ) : (
                <>
                  <Text size="md" c="red" mb="xs">
                    Your device is not compatible with the study.
                    Current device:
                    {' '}
                    {currentDevice}
                  </Text>
                  <Text size="md">
                    This study only works in the following device(s):
                  </Text>
                  <List ml="md">
                    {devices?.allowed.map((device, idx) => (
                      <List.Item key={idx}>
                        {device}
                      </List.Item>
                    ))}
                  </List>
                </>
              )}
          </Card>
          )}

          {!isInputAllowed && (
          <Card shadow="sm" padding="lg" radius="md" mx="md" my="md" withBorder w={400}>
            <Card.Section bg="gray.3" mb="md" p="md" style={{ display: 'flex', justifyContent: 'center' }}>
              <IconHandClick size={48} color="gray" />
            </Card.Section>
            {inputs?.blockedMessage
              ? (
                <>
                  <Text size="md" c="red" mb="xs">
                    {inputs.blockedMessage}
                  </Text>
                  <Text size="md" c="red" mb="xs">
                    Current input:
                    {' '}
                    {currentInputs.length ? currentInputs.join(', ') : 'none detected'}
                  </Text>
                </>
              ) : (
                <>
                  <Text size="md" c="red" mb="xs">
                    Your input type is not compatible with the study.
                    Current input:
                    {' '}
                    {currentInputs.length ? currentInputs.join(', ') : 'none detected'}
                  </Text>
                  <Text size="md">
                    This study only works on devices that support following input type(s):
                  </Text>
                  <List ml="md">
                    {inputs?.allowed.map((input, idx) => (
                      <List.Item key={idx}>
                        {input}
                      </List.Item>
                    ))}
                  </List>
                </>
              )}
          </Card>
          )}

          {!isDisplayAllowed && (
            <Card shadow="sm" padding="lg" radius="md" mx="md" my="md" withBorder w={400}>
              <Card.Section bg="gray.3" mb="md" p="md" style={{ display: 'flex', justifyContent: 'center' }}>
                <IconDeviceDesktop size={48} color="gray" />
              </Card.Section>
              {display?.blockedMessage
                ? (
                  <>
                    <Text size="md" c="red" mb="xs">
                      {display.blockedMessage}
                    </Text>
                    <Text size="md" c="red" mb="xs">
                      Current browser window:
                      {' '}
                      {`${currentDisplay.width} x ${currentDisplay.height}px`}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text size="md" c="red" mb="xs">
                      Your screen size is not compatible with the study.
                      Current browser window:
                      {' '}
                      {`${currentDisplay.width} x ${currentDisplay.height}px`}
                    </Text>
                    <Text size="md">
                      This study only works on devices that support following display size(s):
                    </Text>
                    <List ml="md">
                      {displayRules.map((size) => (
                        <List.Item key={size}>
                          {size}
                        </List.Item>
                      ))}
                    </List>
                  </>
                )}
            </Card>
          )}
        </Flex>
        {isDisplayRequirementNotMet ? (
          <Text size="md" ta="center" maw={560}>
            If you have already opened this study on another device with a suitable display,
            you may close this browser window and continue there. Closing this window will not
            affect your Prolific submission as long as you complete the study from the other
            window before the study time limit.
          </Text>
        ) : (
          <Text size="md" ta="center">
            Please reopen the study link with a supported device.
            <br />
            Thank you for your understanding!
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
