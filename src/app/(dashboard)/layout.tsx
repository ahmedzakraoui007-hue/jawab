'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
    Layout,
    Menu,
    Avatar,
    Dropdown,
    Badge,
    Input,
    Button,
    Typography,
    Space,
    Spin,
} from 'antd';
import type { MenuProps } from 'antd';
import {
    DashboardOutlined,
    MessageOutlined,
    CalendarOutlined,
    SettingOutlined,
    BarChartOutlined,
    BookOutlined,
    BellOutlined,
    QuestionCircleOutlined,
    LogoutOutlined,
    UserOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    SearchOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

// Navigation items for Ant Design Menu
const menuItems: MenuProps['items'] = [
    {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: <Link href="/dashboard">Overview</Link>,
    },
    {
        key: '/dashboard/conversations',
        icon: <Badge count={3} size="small" offset={[10, 0]}><MessageOutlined /></Badge>,
        label: <Link href="/dashboard/conversations">Conversations</Link>,
    },
    {
        key: '/dashboard/knowledge',
        icon: <BookOutlined />,
        label: <Link href="/dashboard/knowledge">Knowledge</Link>,
    },
    {
        key: '/dashboard/bookings',
        icon: <CalendarOutlined />,
        label: <Link href="/dashboard/bookings">Bookings</Link>,
    },
    {
        key: '/dashboard/analytics',
        icon: <BarChartOutlined />,
        label: <Link href="/dashboard/analytics">Analytics</Link>,
    },
    {
        key: '/dashboard/settings',
        icon: <SettingOutlined />,
        label: <Link href="/dashboard/settings">Settings</Link>,
    },
];

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut, loading } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    const handleSignOut = async () => {
        setIsSigningOut(true);
        try {
            await signOut();
            router.push('/');
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            setIsSigningOut(false);
        }
    };

    // Get selected menu key
    const getSelectedKey = () => {
        if (pathname === '/dashboard') return '/dashboard';
        const match = menuItems?.find(item =>
            pathname.startsWith(item?.key as string) && item?.key !== '/dashboard'
        );
        return (match?.key as string) || '/dashboard';
    };

    // Get user initials for avatar
    const getInitials = () => {
        if (user?.displayName) {
            return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        if (user?.email) {
            return user.email[0].toUpperCase();
        }
        return 'U';
    };

    // User dropdown menu
    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile',
            onClick: () => router.push('/dashboard/settings'),
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
            onClick: () => router.push('/dashboard/settings'),
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: isSigningOut ? <Spin size="small" /> : <LogoutOutlined />,
            label: 'Sign out',
            danger: true,
            onClick: handleSignOut,
            disabled: isSigningOut,
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* Sidebar */}
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={260}
                collapsedWidth={80}
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    borderRight: '1px solid #f0f0f0',
                }}
                breakpoint="lg"
                onBreakpoint={(broken) => setCollapsed(broken)}
            >
                {/* Logo */}
                <div style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '0' : '0 24px',
                    borderBottom: '1px solid #f0f0f0',
                }}>
                    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                        }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>ج</span>
                        </div>
                        {!collapsed && (
                            <Text strong style={{ fontSize: 18, color: '#1e293b' }}>Jawab</Text>
                        )}
                    </Link>
                </div>

                {/* Menu */}
                <Menu
                    mode="inline"
                    selectedKeys={[getSelectedKey()]}
                    items={menuItems}
                    style={{
                        border: 'none',
                        padding: '12px 8px',
                    }}
                />

                {/* Business Info */}
                {!collapsed && (
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 16,
                        borderTop: '1px solid #f0f0f0',
                    }}>
                        <div style={{
                            background: '#f8fafc',
                            borderRadius: 12,
                            padding: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <Avatar
                                size={40}
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    fontWeight: 600,
                                }}
                            >
                                GS
                            </Avatar>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text strong style={{ display: 'block', fontSize: 13 }}>
                                    Glamour Ladies Salon
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Professional Plan
                                </Text>
                            </div>
                        </div>
                    </div>
                )}
            </Sider>

            {/* Main Layout */}
            <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'margin-left 0.2s' }}>
                {/* Header */}
                <Header style={{
                    padding: '0 24px',
                    background: '#fff',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}>
                    {/* Left side */}
                    <Space size="middle">
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ fontSize: 16 }}
                        />
                        <Input
                            placeholder="Search conversations, bookings..."
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            style={{
                                width: 320,
                                borderRadius: 8,
                            }}
                        />
                    </Space>

                    {/* Right side */}
                    <Space size="small">
                        <Button type="text" icon={<QuestionCircleOutlined />} />
                        <Badge count={2} size="small">
                            <Button type="text" icon={<BellOutlined />} />
                        </Badge>
                        <Dropdown
                            menu={{ items: userMenuItems }}
                            trigger={['click']}
                            placement="bottomRight"
                        >
                            <Button type="text" style={{ padding: '4px 8px', height: 'auto' }}>
                                <Space>
                                    <Avatar
                                        size={32}
                                        style={{
                                            background: 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {getInitials()}
                                    </Avatar>
                                    <span style={{ fontWeight: 500 }}>
                                        {user?.displayName?.split(' ')[0] || 'User'}
                                    </span>
                                </Space>
                            </Button>
                        </Dropdown>
                    </Space>
                </Header>

                {/* Content */}
                <Content style={{
                    padding: 24,
                    minHeight: 'calc(100vh - 64px)',
                }}>
                    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </ProtectedRoute>
    );
}
