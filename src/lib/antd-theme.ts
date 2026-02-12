import { ThemeConfig } from 'antd';

// Jawab brand theme for Ant Design
export const jawabTheme: ThemeConfig = {
    token: {
        // Primary color - Blue
        colorPrimary: '#2563eb',
        colorInfo: '#2563eb',

        // Success, Warning, Error
        colorSuccess: '#10b981',
        colorWarning: '#f59e0b',
        colorError: '#ef4444',

        // Background colors
        colorBgContainer: '#ffffff',
        colorBgLayout: '#f8fafc',
        colorBgElevated: '#ffffff',

        // Text colors
        colorText: '#1e293b',
        colorTextSecondary: '#64748b',
        colorTextTertiary: '#94a3b8',

        // Border
        colorBorder: '#e2e8f0',
        colorBorderSecondary: '#f1f5f9',

        // Border radius
        borderRadius: 8,
        borderRadiusLG: 12,
        borderRadiusSM: 6,

        // Font
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 14,

        // Sizing
        controlHeight: 40,
        controlHeightLG: 48,
        controlHeightSM: 32,
    },
    components: {
        Layout: {
            siderBg: '#ffffff',
            headerBg: '#ffffff',
            bodyBg: '#f8fafc',
        },
        Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#eff6ff',
            itemSelectedColor: '#2563eb',
            itemHoverBg: '#f1f5f9',
            iconSize: 18,
            itemMarginInline: 8,
            itemPaddingInline: 12,
            itemBorderRadius: 8,
        },
        Card: {
            paddingLG: 24,
            borderRadiusLG: 12,
        },
        Button: {
            borderRadius: 8,
            controlHeight: 40,
        },
        Input: {
            borderRadius: 8,
            controlHeight: 40,
        },
        Table: {
            headerBg: '#f8fafc',
            headerColor: '#64748b',
            borderRadius: 12,
        },
        Modal: {
            borderRadiusLG: 16,
        },
        Tabs: {
            itemSelectedColor: '#2563eb',
            inkBarColor: '#2563eb',
        },
    },
};

// Dark theme variant
export const jawabDarkTheme: ThemeConfig = {
    token: {
        colorPrimary: '#3b82f6',
        colorInfo: '#3b82f6',
        colorSuccess: '#22c55e',
        colorWarning: '#fbbf24',
        colorError: '#f87171',

        colorBgContainer: '#1e293b',
        colorBgLayout: '#0f172a',
        colorBgElevated: '#334155',

        colorText: '#f1f5f9',
        colorTextSecondary: '#94a3b8',
        colorTextTertiary: '#64748b',

        colorBorder: '#334155',
        colorBorderSecondary: '#1e293b',

        borderRadius: 8,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    components: {
        Layout: {
            siderBg: '#1e293b',
            headerBg: '#1e293b',
            bodyBg: '#0f172a',
        },
        Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#334155',
            itemSelectedColor: '#3b82f6',
            itemHoverBg: '#334155',
        },
        Card: {
            colorBgContainer: '#1e293b',
        },
        Table: {
            headerBg: '#1e293b',
            colorBgContainer: '#1e293b',
        },
    },
};
