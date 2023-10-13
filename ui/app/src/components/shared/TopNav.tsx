import React from 'react';
import { getTheme, mergeStyles, Stack } from '@fluentui/react';
import { Link } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { NotificationPanel } from './notifications/NotificationPanel';
import { logo } from '../../assets/IMP_ML_W_N.png'

export const TopNav: React.FunctionComponent = () => {
  return (
    <>
      <div className={contentClass}>
        <Stack horizontal>
          <Stack.Item grow={100}>
            <Link to='/' className='tre-home-link'>
              <img src={logo} alt="IC Logo" height="50px" style={{ marginLeft: '10px', marginRight: '10px', verticalAlign: 'middle' }} />
              <h5 style={{display: 'inline'}}>Imperial TRE</h5>
            </Link>
          </Stack.Item>
          <Stack.Item>
            <NotificationPanel />
          </Stack.Item>
          <Stack.Item grow>
            <UserMenu />
          </Stack.Item>
        </Stack>
      </div>
    </>
  );
};

const theme = getTheme();
const contentClass = mergeStyles([
  {
    // backgroundColor: theme.palette.themeDark,
    backgroundColor: '#003E74',
    color: theme.palette.white,
    lineHeight: '50px',
    padding: '0 10px 0 10px'
  }
]);
