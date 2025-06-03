import { Actions } from '@openfort/ecosystem-js/core';
import { Button, HeaderSection, Layout, Store, useEcosystem, useSearch } from '@openfort/ecosystem-js/react';
import clsx from 'clsx';
import { Check, Plug, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useRapidsafe } from '../../providers';

type BulletPoint = {
  title: string;
  ticked: boolean;
};

const bulletPoints: BulletPoint[] = [
  {
    title: 'Let it see your wallet balance and activity',
    ticked: true,
  },
  {
    title: 'Let it send you requests for transactions',
    ticked: true,
  },
];

function EthRequestAccounts() {
  const { loading: isLoading, setLoading } = useEcosystem();
  const searchParams = useSearch<'eth_requestAccounts'>();
  const { address } = useAccount();
  const [respond, setRespond] = useState<boolean>(false);
  const { connectors, connect } = useConnect();
  
  // Use our enhanced Safe context
  const { initiateSignin, initiateSignup } = useRapidsafe();

  useEffect(() => {
    if(address && respond) {
      Actions.respond({
        status: 'success',
        request: {
          ...{
            id: searchParams.id,
            method: searchParams.method,
            params: searchParams.params,
            chainId: searchParams.chainId,
            sender: searchParams.sender,
            requestId: searchParams.requestId,
          },
        },
        result: {
          value: [address],
        },
      });
    }
  }, [address, respond, searchParams]);

  const handleSignin = async () => {
    setLoading(true);
    try {
      // Use our context function to set auth type to signin
      await initiateSignin();
      
      // Find our custom connector
      const connector = connectors.find((conn) => conn.id === 'xyz.openfort.rapidsafe');
      if (!connector) {
        console.error('Safe connector not found');
        return;
      }
      console.log('[EthRequestAccounts] signin',connector);
      // Connect using the connector
      connect({ connector });
      setRespond(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      // Use our context function to set auth type to signup
      await initiateSignup();
      
      // Find our custom connector
      const connector = connectors.find((conn) => conn.id === 'xyz.openfort.rapidsafe');
      if (!connector) {
        console.error('Safe connector not found');
        return;
      }
      console.log('[EthRequestAccounts] signup');
      // Connect using the connector - it will use the signup flow
      connect({ connector });
      setRespond(true);
    } finally {
      setLoading(false);
    }
  };

  const isIframe = Store.useStore((s) => s.mode === 'iframe');

  return (
    <Layout disabled={isLoading} minHeight={230} maxWidth={isIframe ? 360 : undefined}>
      <HeaderSection
        onIconClick={false}
        isLoading={isLoading}
        icon={Plug}
        showAddress={address ? true:false}
        header={"Sign in"}
        className={clsx(
          'h-[100px]',
          'overflow-hidden transition-all duration-300',
          'transition-all duration-300',
        )}
      />

      <div className='mx-4 mt-4'>
        <div className="overflow-hidden !mt-0">
        <div className={clsx(
            'flex items-start justify-center flex-col gap-2 transform transform-all duration-1000',
        )}
        >
            <div className="flex items-start justify-center flex-col gap-3 mx-1">
            {
                bulletPoints.map((bulletPoint) => (
                <div key={bulletPoint.title} className="flex items-center gap-2">
                    <div
                    className={clsx(
                        'w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center bg-[transparent]',
                        { 'border-valid': bulletPoint.ticked, 'border-danger': !bulletPoint.ticked },
                    )}
                    >
                    {bulletPoint.ticked ? (
                        <Check size={16} className="text-valid" />
                    ) : (
                        <X size={16} className="text-danger" />
                    )}
                    </div>
                    <p className="text-sm">{bulletPoint.title}</p>
                </div>
                ))
            }
            </div>
        </div>
        </div>
      </div>
      <div
        className={clsx(
          'mt-auto w-full interpolate',
          'h-fit',
        )}
      >
        <div className='flex space-x-2 m-4'>
          <Button
            className="w-full"
            variant="secondary"
            onClick={handleSignin}
            disabled={isLoading}
          >
            Sign in
          </Button>
          <Button
            className="w-full"
            variant="primary"
            disabled={isLoading}
            onClick={handleSignUp}
          >
            Sign up
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default EthRequestAccounts;