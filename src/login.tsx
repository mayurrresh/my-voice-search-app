import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import './Login.css';
import { useNavigate } from 'react-router-dom'

const Login: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const success = login(username, password);
        if (success) {
            navigate('/MainApp');
        } else {
            setError('Invalid username or password');
        }
    };


    return (
        <div className="login-page">
            <div className="login-card">
                <h2>🔒 Login</h2>
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        />
                        <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        />
                        {error && <p className="error">{error}</p>}
                        <button type="submit">Login</button>
                </form>
            </div>
        </div>
    );
};

export default Login;