import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SignIn } from '../SignIn';
import { SignUp } from '../SignUp';
import { ForgotPassword } from '../ForgotPassword';

interface LoginProps {
  onSignIn?: (identifier: string, password: string) => Promise<void>;
  onSignUp?: (username: string, email: string, password: string, confirmPassword: string) => Promise<any>;
}

export const Login: React.FC<LoginProps> = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);

  if (authMode === 'signup') {
    return <SignUp onNavigateToSignIn={() => setAuthMode('signin')} />;
  }

  if (authMode === 'forgot') {
    return <ForgotPassword onNavigateToSignIn={() => setAuthMode('signin')} />;
  }

  return (
    <SignIn 
      onNavigateToSignUp={() => setAuthMode('signup')} 
      onNavigateToForgot={() => setAuthMode('forgot')} 
    />
  );
};

export default Login;