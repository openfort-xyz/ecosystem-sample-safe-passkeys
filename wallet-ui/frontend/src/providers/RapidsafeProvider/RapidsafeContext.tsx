import { createContext, useContext } from "react";
import { AppState } from "@openfort/ecosystem-js/react";

export interface RapidsafeContextType {
  // Navigation function
  navigateTo: (appState?: AppState) => void;
  
  // Authentication flow controls
  initiateSignup: () => void;
  initiateSignin: () => void;
  isSignupFlow: boolean;
  
  // New function to set account label
  setAccountLabel: (label: string) => void;
}

// Default values for the context
const defaultContext: RapidsafeContextType = {
  navigateTo: () => {},
  initiateSignup: () => {},
  initiateSignin: () => {},
  isSignupFlow: false,
  setAccountLabel: () => {},
};

export const RapidsafeContext = createContext<RapidsafeContextType>(defaultContext);

// Custom hook to use the useRapidsafe context
export const useRapidsafe = (): RapidsafeContextType => useContext(RapidsafeContext);