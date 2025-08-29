import '../App.css';
import './Todolist.css';
import './TaskDropArea.css';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';

import metadata from 'libphonenumber-js/metadata.full.json'
import examples from 'libphonenumber-js/examples.mobile.json';
import { getExampleNumber } from 'libphonenumber-js'
import type { CountryCode } from 'libphonenumber-js';
import { formatPhoneNumber, isValidPhoneNumber } from 'react-phone-number-input'

/**
 * The Login Page component.
 */

function Login() {

  const navigate = useNavigate();

  const [isLoginWithEmail, setIsLoginWithEmail] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>(undefined);
  const [phoneCountry, setPhoneCountry] = useState<string | undefined>(undefined);
  const [phoneNumberPlaceholder, setPhoneNumberPlaceholder] = useState<string | undefined>(undefined);
  const [isPhoneNumberValid, setIsPhoneNumberValid] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string | undefined>(undefined);

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  const handlePressLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let phoneNumber = null;
    let email = null;
    if (isLoginWithEmail) {
      email = event.currentTarget.email.value;
      phoneNumber = null;
    } else {
      email = null;
      phoneNumber = event.currentTarget.phoneNumber.value;
    }
    const password = event.currentTarget.password.value;

    // Validate phone number if logging in with phone
    if (!isLoginWithEmail && phoneNumber) {
      if (!isPhoneNumberValid) {
        alert('Invalid phone number format');
        return;
      }
    }

    try {
      const apiUrl = import.meta.env.VITE_NODE_ENV === 'production' 
      ? import.meta.env.VITE_API_BASE_URL 
      : 'http://localhost:3001';
      
      const res = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify({ email, phoneNumber, password })
      });
      if (res.ok) {
        const data = await res.json();
        // Handle successful login, e.g., redirect to dashboard or store user data
        console.log('Login successful:', data);
        navigate('/');
      }
      else {
        const errorData = await res.json();
        console.error('Login failed:', errorData);
        // Handle login failure, e.g., show an error message
        setErrorText(`Login failed. Please check your ${isLoginWithEmail ? 'email' : 'phone number'} and password.`);
      }
    } catch (error) {
      console.error('Error during login:', error);
      // Handle network or other errors
    }
  };

  useEffect(() => {
    const examplePhone = getExampleNumber((phoneCountry || 'US') as CountryCode, examples);
    if (examplePhone) {
      setPhoneNumberPlaceholder(formatPhoneNumber(examplePhone.number));
    }
  }, [phoneCountry]);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-title">Login</div>
        <form className="login-form" onSubmit={handlePressLogin}>
          {isLoginWithEmail ? (
            <input
              key="email-input"
              className="login-input"
              type="email"
              id="email"
              name="email"
              placeholder="Raccoon@study.com"
              defaultValue="demouser001@raccoon.com"
              required
            />
          ) : (
            <div className="login-input-wrapper">
              <PhoneInput
                className={`login-phone-input ${isPhoneNumberValid ? 'valid' : 'invalid'}`}
                defaultCountry="US"
                placeholder={phoneNumberPlaceholder}
                value={phoneNumber}
                onChange={(value) => {
                  setPhoneNumber(value);
                  setIsPhoneNumberValid(isValidPhoneNumber(value || ''));
                }}
                onCountryChange={(country) => {
                  setPhoneCountry(country);
                }}
                name="phoneNumber"
                id="phoneNumber"
                required
              />
            </div>
          )}
          <input
            className="login-input"
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            defaultValue="password"
            required
          />
          <div className="login-toggle">
            <button
              className={`login-toggle-btn`}
              type="button"
              onClick={() => {
                setIsLoginWithEmail(!isLoginWithEmail);
              }}
            >
              {isLoginWithEmail ? 'To login with Phone Number' : 'To login with Email'}
            </button>
          </div>
          <button className="login-btn" type="submit">Login</button>
        </form>
        {errorText && (
          <div className="login-error">
            {errorText}
          </div>
        )}
        <div className="login-footer">
          <p>Don't have an account? <a href="/signup">Sign up</a></p>
          <p><a href="/about">About</a></p>
        </div>
      </div>
    </div>
  );
}

export default Login