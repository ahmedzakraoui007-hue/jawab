'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
    Card,
    Table,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    Tabs,
    Tag,
    Space,
    Typography,
    Empty,
    Alert,
    Spin,
    Popconfirm,
    message,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    DollarOutlined,
    ClockCircleOutlined,
    QuestionCircleOutlined,
    BookOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Types
interface Service {
    id: string;
    name: string;
    nameAr?: string;
    description?: string;
    price: number;
    duration: number;
    category?: string;
    active: boolean;
}

interface FAQ {
    id: string;
    question: string;
    questionAr?: string;
    answer: string;
    answerAr?: string;
    category?: string;
    active: boolean;
}

export default function KnowledgeBasePage() {
    const { user } = useAuth();
    const [services, setServices] = useState<Service[]>([]);
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(false);
    const [serviceModalOpen, setServiceModalOpen] = useState(false);
    const [faqModalOpen, setFaqModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [serviceForm] = Form.useForm();
    const [faqForm] = Form.useForm();

    const businessId = 'demo-business';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [servicesRes, faqsRes] = await Promise.all([
                fetch(`/api/business/services?businessId=${businessId}`),
                fetch(`/api/business/faqs?businessId=${businessId}`)
            ]);

            if (servicesRes.ok) {
                const data = await servicesRes.json();
                setServices(data.services || []);
            }
            if (faqsRes.ok) {
                const data = await faqsRes.json();
                setFaqs(data.faqs || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Service handlers
    const handleSaveService = async (values: Partial<Service>) => {
        setModalLoading(true);
        try {
            const method = editingService ? 'PUT' : 'POST';
            const body = editingService
                ? { businessId, serviceId: editingService.id, updates: values }
                : { businessId, ...values };

            const res = await fetch('/api/business/services', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                message.success(`Service ${editingService ? 'updated' : 'added'} successfully!`);
                fetchData();
                setServiceModalOpen(false);
                setEditingService(null);
                serviceForm.resetFields();
            } else {
                const error = await res.json();
                message.error(error.error || 'Failed to save service');
            }
        } catch {
            message.error('Failed to save service');
        } finally {
            setModalLoading(false);
        }
    };

    const handleDeleteService = async (service: Service) => {
        try {
            const res = await fetch('/api/business/services', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId, serviceId: service.id }),
            });

            if (res.ok) {
                message.success('Service deleted');
                fetchData();
            }
        } catch {
            message.error('Failed to delete service');
        }
    };

    // FAQ handlers
    const handleSaveFaq = async (values: Partial<FAQ>) => {
        setModalLoading(true);
        try {
            const method = editingFaq ? 'PUT' : 'POST';
            const body = editingFaq
                ? { businessId, faqId: editingFaq.id, updates: values }
                : { businessId, ...values };

            const res = await fetch('/api/business/faqs', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                message.success(`FAQ ${editingFaq ? 'updated' : 'added'} successfully!`);
                fetchData();
                setFaqModalOpen(false);
                setEditingFaq(null);
                faqForm.resetFields();
            } else {
                const error = await res.json();
                message.error(error.error || 'Failed to save FAQ');
            }
        } catch {
            message.error('Failed to save FAQ');
        } finally {
            setModalLoading(false);
        }
    };

    const handleDeleteFaq = async (faq: FAQ) => {
        try {
            const res = await fetch('/api/business/faqs', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId, faqId: faq.id }),
            });

            if (res.ok) {
                message.success('FAQ deleted');
                fetchData();
            }
        } catch {
            message.error('Failed to delete FAQ');
        }
    };

    // Table columns
    const serviceColumns: ColumnsType<Service> = [
        {
            title: 'Service',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
                <div>
                    <Text strong>{name}</Text>
                    {record.nameAr && <Text type="secondary" style={{ marginLeft: 8 }}>({record.nameAr})</Text>}
                    {record.description && <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>{record.description}</Paragraph>}
                </div>
            ),
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            width: 100,
            render: (price) => <Tag color="blue">{price} AED</Tag>,
        },
        {
            title: 'Duration',
            dataIndex: 'duration',
            key: 'duration',
            width: 100,
            render: (duration) => <Tag icon={<ClockCircleOutlined />}>{duration} min</Tag>,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            width: 120,
            render: (category) => category ? <Tag>{category}</Tag> : '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingService(record);
                            serviceForm.setFieldsValue(record);
                            setServiceModalOpen(true);
                        }}
                    />
                    <Popconfirm
                        title="Delete this service?"
                        onConfirm={() => handleDeleteService(record)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const faqColumns: ColumnsType<FAQ> = [
        {
            title: 'Question',
            dataIndex: 'question',
            key: 'question',
            render: (question, record) => (
                <div>
                    <Text strong><QuestionCircleOutlined style={{ marginRight: 8, color: '#2563eb' }} />{question}</Text>
                    {record.questionAr && <Paragraph type="secondary" dir="rtl" style={{ margin: 0, fontSize: 12 }}>{record.questionAr}</Paragraph>}
                </div>
            ),
        },
        {
            title: 'Answer',
            dataIndex: 'answer',
            key: 'answer',
            render: (answer) => <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>{answer}</Paragraph>,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            width: 120,
            render: (category) => category ? <Tag>{category}</Tag> : '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingFaq(record);
                            faqForm.setFieldsValue(record);
                            setFaqModalOpen(true);
                        }}
                    />
                    <Popconfirm
                        title="Delete this FAQ?"
                        onConfirm={() => handleDeleteFaq(record)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const tabItems = [
        {
            key: 'services',
            label: (
                <span>
                    <DollarOutlined /> Services ({services.length})
                </span>
            ),
            children: (
                <div>
                    <div style={{ marginBottom: 16, textAlign: 'right' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setEditingService(null);
                                serviceForm.resetFields();
                                setServiceModalOpen(true);
                            }}
                        >
                            Add Service
                        </Button>
                    </div>
                    <Table
                        columns={serviceColumns}
                        dataSource={services}
                        rowKey="id"
                        loading={loading}
                        locale={{ emptyText: <Empty description="No services yet. Add your first service!" /> }}
                    />
                </div>
            ),
        },
        {
            key: 'faqs',
            label: (
                <span>
                    <QuestionCircleOutlined /> FAQs ({faqs.length})
                </span>
            ),
            children: (
                <div>
                    <div style={{ marginBottom: 16, textAlign: 'right' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setEditingFaq(null);
                                faqForm.resetFields();
                                setFaqModalOpen(true);
                            }}
                        >
                            Add FAQ
                        </Button>
                    </div>
                    <Table
                        columns={faqColumns}
                        dataSource={faqs}
                        rowKey="id"
                        loading={loading}
                        locale={{ emptyText: <Empty description="No FAQs yet. Add common questions!" /> }}
                    />
                </div>
            ),
        },
    ];

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 4 }}>
                    <BookOutlined style={{ marginRight: 8, color: '#2563eb' }} />
                    Knowledge Base
                </Title>
                <Text type="secondary">
                    Manage your services and FAQs. The AI uses this information to answer customer questions.
                </Text>
            </div>

            {/* AI Info Banner */}
            <Alert
                message="AI-Powered Responses"
                description="The AI assistant automatically uses your services and FAQs to give accurate, personalized responses to customers on WhatsApp, Instagram, and Facebook."
                type="info"
                icon={<ThunderboltOutlined />}
                showIcon
                style={{ marginBottom: 24 }}
            />

            {/* Tabs */}
            <Card>
                <Tabs items={tabItems} />
            </Card>

            {/* Service Modal */}
            <Modal
                title={editingService ? 'Edit Service' : 'Add Service'}
                open={serviceModalOpen}
                onCancel={() => { setServiceModalOpen(false); setEditingService(null); }}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={serviceForm}
                    layout="vertical"
                    onFinish={handleSaveService}
                >
                    <Form.Item name="name" label="Service Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., Haircut" />
                    </Form.Item>
                    <Form.Item name="nameAr" label="Arabic Name">
                        <Input placeholder="e.g., قص الشعر" dir="rtl" />
                    </Form.Item>
                    <Space style={{ width: '100%' }} size="middle">
                        <Form.Item name="price" label="Price (AED)" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="duration" label="Duration (min)" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <InputNumber min={5} step={5} style={{ width: '100%' }} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="category" label="Category">
                        <Input placeholder="e.g., Hair, Nails, Facial" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={2} placeholder="Brief description" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setServiceModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={modalLoading}>
                                Save
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* FAQ Modal */}
            <Modal
                title={editingFaq ? 'Edit FAQ' : 'Add FAQ'}
                open={faqModalOpen}
                onCancel={() => { setFaqModalOpen(false); setEditingFaq(null); }}
                footer={null}
                destroyOnClose
                width={600}
            >
                <Form
                    form={faqForm}
                    layout="vertical"
                    onFinish={handleSaveFaq}
                >
                    <Form.Item name="question" label="Question" rules={[{ required: true }]}>
                        <Input placeholder="e.g., Do you have parking?" />
                    </Form.Item>
                    <Form.Item name="questionAr" label="Question (Arabic)">
                        <Input placeholder="e.g., هل عندكم موقف سيارات؟" dir="rtl" />
                    </Form.Item>
                    <Form.Item name="answer" label="Answer" rules={[{ required: true }]}>
                        <TextArea rows={3} placeholder="e.g., Yes! We have free parking." />
                    </Form.Item>
                    <Form.Item name="answerAr" label="Answer (Arabic)">
                        <TextArea rows={3} placeholder="e.g., نعم! عندنا موقف مجاني." dir="rtl" />
                    </Form.Item>
                    <Form.Item name="category" label="Category">
                        <Input placeholder="e.g., Location, Pricing, Hours" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setFaqModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={modalLoading}>
                                Save
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
