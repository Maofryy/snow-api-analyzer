
import React, { useEffect } from 'react';
import { BenchmarkProvider } from '../contexts/BenchmarkContext';
import { Header } from '../components/Header/Header';
import { TestConfiguration } from '../components/TestConfiguration/TestConfiguration';
import { ExecutionArea } from '../components/ExecutionArea/ExecutionArea';
import { Scoreboard } from '../components/Scoreboard/Scoreboard';
import { useBenchmark } from '../contexts/BenchmarkContext';

function BenchmarkDashboard() {
  const { dispatch } = useBenchmark();

  useEffect(() => {
    // Mock ServiceNow connection for demo purposes
    dispatch({
      type: 'SET_INSTANCE',
      payload: {
        url: 'https://dev12345.service-now.com',
        username: 'admin',
        password: '****',
        connected: true,
      },
    });
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
