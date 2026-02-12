'use client';

import { AuthProvider } from '@/lib/auth-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App as AntdApp } from 'antd';
import { jawabTheme } from '@/lib/antd-theme';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                retry: 1,
            },
        },
    }));

    return (
        <AntdRegistry>
            <ConfigProvider theme={jawabTheme}>
                <AntdApp>
                    <QueryClientProvider client={queryClient}>
                        <AuthProvider>
                            {children}
                        </AuthProvider>
                    </QueryClientProvider>
                </AntdApp>
            </ConfigProvider>
        </AntdRegistry>
    );
}
