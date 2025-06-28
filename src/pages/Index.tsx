
import React, { useEffect } from 'react';
import { BenchmarkProvider } from '../contexts/BenchmarkContext';
import { ServiceNowInstance } from '../types';
import { Header } from '../components/Header/Header';
import { TestConfiguration } from '../components/TestConfiguration/TestConfiguration';
import { ExecutionArea } from '../components/ExecutionArea/ExecutionArea';
import { Scoreboard } from '../components/Scoreboard/Scoreboard';
import { useBenchmark } from '../contexts/BenchmarkContext';

function BenchmarkDashboard() {
  const { dispatch } = useBenchmark();

  useEffect(() => {
    // Try the connection to ServiceNow -> store token
      const instance: ServiceNowInstance = {
        url: import.meta.env.VITE_INSTANCE_URL,
        username: import.meta.env.VITE_APP_USER,
        password: import.meta.env.VITE_APP_PASSWORD,
        token: '',
        connected: false,
      };

    fetch(`${instance.url}/api/now/table/sys_user?sysparm_query=user_name=${instance.username}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${instance.username}:${instance.password}`)}`,
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data.result.length > 0) {
          dispatch({
            type: 'SET_INSTANCE',
            payload: {
              url: instance.url,
              username: instance.username,
              password: instance.password,
              token: '',
              connected: true,
            },
          });
        }
      })
      .catch(error => {
        console.error('Error connecting to ServiceNow:', error);
      });

    // Mock ServiceNow connection for demo purposes
    // dispatch({
    //   type: 'SET_INSTANCE',
    //   payload: {
    //     url: 'https://dev12345.service-now.com',
    //     username: 'admin',
    //     password: '****',
    //     connected: true,
    //   },
    // });
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left side - Test Configuration and Execution (70% width) */}
          <div className="lg:col-span-3 space-y-8">
            <TestConfiguration />
            <ExecutionArea />
          </div>
          
          {/* Right side - Scoreboard (30% width) */}
          <div className="lg:col-span-1">
            <Scoreboard />
          </div>
        </div>
      </main>
    </div>
  );
}

const Index = () => {
  return (
    <BenchmarkProvider>
      <BenchmarkDashboard />
    </BenchmarkProvider>
  );
};

export default Index;
