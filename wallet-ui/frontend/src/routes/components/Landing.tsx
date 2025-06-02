import * as React from 'react'
import { humanId } from 'human-id'
import { Sparkles } from 'lucide-react';
import { Button } from '@openfort/ecosystem-js/react'
import { useConnect } from 'wagmi';

import { useRapidsafe } from '../../providers';
import { LogoMark } from '../../components/LogoMark';


const id = () => humanId({ capitalize: true, separator: ' ' })

export function Landing() {
  const [label, setLabel] = React.useState(id())
  const [isApproving, setIsApproving] = React.useState(false);

  const isLoading = isApproving;
  const { initiateSignin, initiateSignup, setAccountLabel } = useRapidsafe();
  const { connectors, connect } = useConnect();
  
  const handleSignin = async () => {
    setIsApproving(true);
    try {
      // Use our context function to set auth type to signin
      await initiateSignin();
      
      // Set the account label before connecting
      setAccountLabel(label);
      
      // Find our custom connector
      const connector = connectors.find((conn) => conn.id === 'xyz.openfort.rapidsafe');
      if (!connector) {
        console.error('Safe connector not found');
        return;
      }
      
      // Connect using the connector
      connect({ connector });
    } finally {
      setIsApproving(false);
    }
  };

  const handleSignUp = async () => {
    setIsApproving(true);
    try {
      await initiateSignup();
      setAccountLabel(label);
      
      // Find our custom connector
      const connector = connectors.find((conn) => conn.id === 'xyz.openfort.rapidsafe');
      if (!connector) {
        console.error('Safe connector not found');
        return;
      }
      // Connect using the connector - it will use the signup flow
      connect({ connector });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between">
      <div className="flex flex-1 flex-col items-center justify-center w-full px-6 py-12">
        <div className="sm:mx-auto w-full max-w-sm">
          {/* Logo - square with rounded corners */}
          <div className="mx-auto flex justify-center">
            <LogoMark size={80} scale='0.17'/>
          </div>
          
          {/* Updated heading and subheading */}
          <h2 className="mt-10 text-center text-2xl font-semibold leading-6 text-gray-900">
            Welcome to RapidSafe
          </h2>
          <p className="mt-2 text-center text-base text-gray-500">
            Log in or sign up to get started.
          </p>
        </div>

        <div className="mt-10 mx-auto w-full max-w-sm">
          {/* Simplified form with just one input */}
          <div className="rounded-md flex bg-gray-50 text-base text-gray-900 placeholder:text-gray-400">
            <input
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              maxLength={32}
              id="email-or-number"
              name="email-or-number"
              type="text"
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter a name…"
              spellCheck={false}
              value={label}
              className="rounded-md block w-full bg-inherit px-3 py-3  focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-gray-400"
            />
            <button
              className="rounded-full bg-accentTint p-2 transition-all duration-200 hover:bg-accentTintHover active:scale-90"
              onClick={() => setLabel(id())}
              type="button"
            >
              <Sparkles className="size-5 text-gray-900" />
            </button>
          </div>          
          <div className="h-4" />
          {/* Information text */}
          <p className="text-sm text-gray-400 text-center">
            You can't change this name later.
          </p>
          <Button
            className="w-full"
            variant="primary"
            disabled={isLoading}
            onClick={handleSignUp}
          >
            
            Create
          </Button>

          <div className="h-3" />

          <div className="h-3.5 border-gray-200 border-b text-center">
            <span className="my-auto px-2 font-[500] text-gray-400 bg-white">
              or
            </span>
          </div>

          <div className="h-6" />
          <Button
            className="w-full"
            variant="secondary"
            onClick={handleSignin}
            disabled={isLoading}
          >
            Sign in
          </Button>
        </div>
        <div className="h-6" />
        <div className='flex items-center'>
          <p className="text-sm text-gray-400 text-center">
            Want to integrate Realm with your application?{' '}
            <a 
              href="https://realm.sample.openfort.xyz" 
              className="text-blue-500 hover:text-blue-700"
              target="_blank" 
              rel="noopener noreferrer"
            >
              Learn more
            </a>
          </p>
        </div>
      </div>
      
      {/* Footer - fixed at the bottom */}
      <footer className="w-full py-6">
        <nav>
          <ul className="flex justify-center space-x-6 text-sm text-gray-400">
            <li>
              <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">
                Developers
              </a>
            </li>
            <li>
              <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">
                Privacy
              </a>
            </li>
            <li>
              <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">
                Terms
              </a>
            </li>
          </ul>
        </nav>
      </footer>
    </div>
  )
}