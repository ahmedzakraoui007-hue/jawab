'use client';

import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface StatsCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    change?: number;
    changeDirection?: 'up' | 'down';
    formatter?: (val: number) => string;
    valueStyle?: React.CSSProperties;
    /** Extra content rendered below the Statistic */
    extra?: React.ReactNode;
}

export function StatsCard({
    title,
    value,
    icon,
    prefix,
    suffix,
    change,
    changeDirection,
    formatter,
    valueStyle,
    extra,
}: StatsCardProps) {
    const changeSuffix = change != null ? (
        <Text
            type={changeDirection === 'down' ? 'success' : 'success'}
            style={{ fontSize: 14 }}
        >
            {changeDirection === 'down' ? <ArrowDownOutlined /> : <ArrowUpOutlined />} {Math.abs(change)}%
        </Text>
    ) : suffix;

    return (
        <Card hoverable>
            <Statistic
                title={title}
                value={value}
                valueStyle={valueStyle}
                prefix={
                    <>
                        {icon}
                        {prefix}
                    </>
                }
                suffix={changeSuffix}
                formatter={formatter ? (val) => formatter(Number(val)) : undefined}
            />
            {extra}
        </Card>
    );
}
