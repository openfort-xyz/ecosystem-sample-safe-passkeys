import { 
  WalletGrantPermissions,
  WalletSendCalls, 
  EthSendTransaction, 
  EthSignTypedDataV4, 
  PersonalSign, 
  WalletShowCalls,
  Settings,
  UnsupportedMethod,
} from '@openfort/ecosystem-js/react';
import { Route, Routes } from 'react-router-dom';
import { withAuthenticationRequired } from './providers/RapidsafeProvider/withAuthenticationRequired';
import EthRequestAccounts from './routes/sign/EthRequestAccounts';
import { Home } from './routes/sign/Home';

const ProtectedRoute = ({ component, ...args }: any) => {
  const Component = withAuthenticationRequired(component, {
    onRedirecting: () => <p>loading</p>,
  });
  return <Component {...args} />;
};

function App() {
  return (
    <Routes>
      <Route path='/sign/personal-sign' element={<PersonalSign />} />
      <Route path='/sign/eth-sign-typed-data-v-4' element={<ProtectedRoute component={EthSignTypedDataV4} />} />
      <Route path='/sign/eth-send-transaction' element={<ProtectedRoute component={EthSendTransaction} />} />
      <Route path='/sign/wallet-grant-permissions' element={<ProtectedRoute component={WalletGrantPermissions} />} />
      <Route path='/sign/wallet-show-calls' element={<ProtectedRoute component={WalletShowCalls} />} />
      <Route path='/sign/wallet-send-calls' element={<ProtectedRoute component={WalletSendCalls} />} />
      <Route path='/sign/eth-request-accounts' element={<EthRequestAccounts />} />
      <Route path='/sign/settings' element={<ProtectedRoute component={Settings} />} />
      <Route path='/sign/*' element={<UnsupportedMethod />} />
      <Route path='/' element={<Home />} />
    </Routes>
  );
}

export default App;
