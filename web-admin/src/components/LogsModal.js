import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Collapse, Image, Typography } from '@douyinfe/semi-ui';
import { 
    IconChevronDown, 
    IconCopy, 
    IconTickCircle, 
    IconCode,
    IconSetting,
    IconComment,
    IconUser,
    IconSmartphoneStroked,
    IconListView,
    IconArticle,
    IconTerminal,
    IconBrackets
} from '@douyinfe/semi-icons';

const ModalContent = ({ content }) => {
    const [copiedStates, setCopiedStates] = useState({});
    const panelRefs = useRef({});
    const [activeSection, setActiveSection] = useState(null);
    const [openConversation, setOpenConversation] = useState(true);

    // 优化内容解析逻辑
    const parseContent = useCallback((content) => {
        try {
            if (!content?.trim()) {
                throw new Error('无效的内容格式');
            }

            // 提取请求和响应部分
            const lastIndex = content.lastIndexOf('【Response Body】:');
            const requestPart = content.substring(0, lastIndex);
            const responsePart = content.substring(lastIndex + '【Response Body】:'.length);

            // 解析请求体
            const match = requestPart.match(/【Request Body】:([\s\S]*)/);
            if (!match?.[1]?.trim()) {
                throw new Error('无法找请求体内容');
            }

            const requestJson = JSON.parse(match[1].trim());
            const { messages = [], ...otherProps } = requestJson;

            // 处理消息数组
            const parsedMessages = Array.isArray(messages) ? messages.map(message => {
                const { role, content, ...otherMessageProps } = message;
                const parsedContent = Array.isArray(content) 
                    ? content.map(item => {
                        if (typeof item === 'string') {
                            return { type: 'text', text: item.trim() };
                        } else if (item.type === 'text') {
                            return { type: 'text', text: item.text.trim() };
                        } else if (item.type === 'image_url') {
                            return { type: 'image', url: item.image_url.url };
                        }
                        return { type: 'text', text: JSON.stringify(item) };
                    })
                    : [{ type: 'text', text: content?.trim() || '' }];

                return {
                    role,
                    content: parsedContent,
                    otherProps: Object.keys(otherMessageProps).length > 0 ? otherMessageProps : null
                };
            }) : [];

            return {
                requestProps: otherProps,
                messages: parsedMessages,
                response: responsePart.trim() // 直接使用响应字符串，不进行JSON解析
            };
        } catch (error) {
            console.error('解析内容时出错:', error);
            return { requestProps: {}, messages: [], response: '' };
        }
    }, []);

    const { requestProps, messages, response } = useMemo(() => parseContent(content), [content, parseContent]);

    // 监听滚动事件
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            let active = null;
            Object.entries(panelRefs.current).forEach(([id, ref]) => {
                if (ref && ref.offsetTop <= scrollPosition + 100) {
                    active = id;
                }
            });
            setActiveSection(active);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 复制功能
    const handleCopy = useCallback((content, index) => {
        let textContent;
        
        if (Array.isArray(content)) {
            // 处理数组类型的内容（��息内容）
            textContent = content.map(item => {
                if (item.type === 'text') return item.text;
                if (item.type === 'image') return `[Image: ${item.url}]`;
                return '';
            }).join('\n');
        } else if (typeof content === 'object') {
            // 处理对象类型的内容（参数和其他属性）
            textContent = JSON.stringify(content, null, 2);
        } else {
            // 处理字符串类型的内容（AI响应）
            textContent = String(content);
        }

        navigator.clipboard.writeText(textContent).then(() => {
            setCopiedStates(prev => ({ ...prev, [index]: true }));
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [index]: false }));
            }, 2000);
        }).catch(error => {
            console.error('复制失败:', error);
        });
    }, []);

    // 滚动到指定部分
    const scrollToSection = useCallback((sectionId) => {
        panelRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth' });
        setActiveSection(sectionId);
    }, []);

    return (
        <div style={{ 
            display: 'flex', 
            height: '100%',
            backgroundColor: 'var(--semi-color-bg-1)',
            overflow: 'hidden'
        }}>
            {/* 左侧导航 */}
            <div style={{
                width: '240px',
                borderRight: '1px solid var(--semi-color-border)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--semi-color-bg-0)',
                boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
                height: '100%',
                transition: 'all 0.3s ease',
                overflowY: 'auto'
            }}>
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--semi-color-border)',
                    backgroundColor: 'var(--semi-color-bg-2)',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        height: '32px'
                    }}>
                        <IconListView 
                            size="large" 
                            style={{ 
                                fontSize: '24px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        />
                        <Typography.Title 
                            heading={4} 
                            style={{ 
                                margin: 0,
                                color: 'var(--semi-color-text-0)',
                                lineHeight: '24px',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            目录
                        </Typography.Title>
                    </div>
                </div>
                
                {/* 导航项目 */}
                <div style={{ 
                    padding: '16px',
                    flex: 1,
                    overflowY: 'auto'
                }}>
                    <div
                        onClick={() => scrollToSection('params')}
                        style={{
                            padding: '12px',
                            cursor: 'pointer',
                            backgroundColor: activeSection === 'params' ? 'rgba(var(--semi-yellow-0), 0.6)' : 'transparent',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease',
                            transform: activeSection === 'params' ? 'translateX(4px)' : 'none',
                            ':hover': {
                                backgroundColor: 'rgba(var(--semi-yellow-0), 0.4)',
                                transform: 'translateX(4px)'
                            }
                        }}
                    >
                        <IconSetting style={{ color: 'var(--semi-color-yellow-6)' }} />
                        <span style={{ color: 'var(--semi-color-yellow-6)' }}>参数</span>
                    </div>

                    {/* 对话内容组 */}
                    <div style={{ marginBottom: '16px' }}>
                        <div
                            onClick={() => setOpenConversation(!openConversation)}
                            style={{
                                padding: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderRadius: '6px',
                                transition: 'all 0.3s ease',
                                ':hover': {
                                    backgroundColor: 'var(--semi-color-fill-0)'
                                }
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <IconComment style={{ color: 'var(--semi-color-text-2)' }} />
                                <span style={{ color: 'var(--semi-color-text-2)' }}>对话内容</span>
                            </div>
                            <IconChevronDown
                                style={{
                                    transform: openConversation ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 0.3s'
                                }}
                            />
                        </div>
                        
                        {openConversation && (
                            <div style={{
                                transition: 'all 0.3s ease',
                                overflow: 'hidden'
                            }}>
                                {messages.map((item, index) => (
                                    <div
                                        key={`conv-${index}`}
                                        onClick={() => scrollToSection(`conv-${index}`)}
                                        style={{
                                            padding: '8px 12px 8px 32px',
                                            cursor: 'pointer',
                                            backgroundColor: activeSection === `conv-${index}` 
                                                ? item.role === 'user'
                                                    ? 'rgba(var(--semi-blue-0), 0.6)'
                                                    : item.role === 'assistant'
                                                    ? 'rgba(var(--semi-purple-0), 0.6)'
                                                    : item.role === 'system'
                                                    ? 'rgba(var(--semi-cyan-0), 0.6)'
                                                    : item.role === 'tool'
                                                    ? 'rgba(var(--semi-orange-0), 0.6)'
                                                    : 'var(--semi-color-fill-0)'
                                                : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: 'all 0.3s ease',
                                            transform: activeSection === `conv-${index}` ? 'translateX(4px)' : 'none',
                                            ':hover': {
                                                backgroundColor: item.role === 'user'
                                                    ? 'rgba(var(--semi-blue-0), 0.4)'
                                                    : item.role === 'assistant'
                                                    ? 'rgba(var(--semi-purple-0), 0.4)'
                                                    : item.role === 'system'
                                                    ? 'rgba(var(--semi-cyan-0), 0.4)'
                                                    : item.role === 'tool'
                                                    ? 'rgba(var(--semi-orange-0), 0.4)'
                                                    : 'var(--semi-color-fill-0)',
                                                transform: 'translateX(4px)'
                                            }
                                        }}
                                    >
                                        {item.role === 'user' ? (
                                            <IconUser style={{ color: 'var(--semi-color-blue-6)' }} />
                                        ) : item.role === 'assistant' ? (
                                            <IconSmartphoneStroked style={{ color: 'var(--semi-color-purple-6)' }} />
                                        ) : item.role === 'system' ? (
                                            <IconTerminal style={{ color: 'var(--semi-color-cyan-6)' }} />
                                        ) : item.role === 'tool' ? (
                                            <IconBrackets style={{ color: 'var(--semi-color-orange-6)' }} />
                                        ) : (
                                            <IconBrackets style={{ color: 'var(--semi-color-text-2)' }} />
                                        )}
                                        <span style={{
                                            color: item.role === 'user'
                                                ? 'var(--semi-color-blue-6)'
                                                : item.role === 'assistant'
                                                ? 'var(--semi-color-purple-6)'
                                                : item.role === 'system'
                                                ? 'var(--semi-color-cyan-6)'
                                                : item.role === 'tool'
                                                ? 'var(--semi-color-orange-6)'
                                                : 'var(--semi-color-text-0)'
                                        }}>
                                            {item.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div
                        onClick={() => scrollToSection('response')}
                        style={{
                            padding: '12px',
                            cursor: 'pointer',
                            backgroundColor: activeSection === 'response' ? 'rgba(var(--semi-green-0), 0.6)' : 'transparent',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease',
                            transform: activeSection === 'response' ? 'translateX(4px)' : 'none',
                            ':hover': {
                                backgroundColor: 'rgba(var(--semi-green-0), 0.4)',
                                transform: 'translateX(4px)'
                            }
                        }}
                    >
                        <IconArticle style={{ color: 'var(--semi-color-green-6)' }} />
                        <span style={{ color: 'var(--semi-color-green-6)' }}>AI响应</span>
                    </div>
                </div>
            </div>

            {/* 右侧内容区域 */}
            <div style={{
                flex: 1,
                height: '100%',
                overflow: 'hidden',
                backgroundColor: 'var(--semi-color-bg-0)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    flex: 1,
                    padding: '24px',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}>
                    <div style={{
                        maxWidth: '1200px',
                        margin: '0 auto',
                        paddingBottom: '24px'
                    }}>
                        {/* 参数内容 */}
                        <div
                            ref={el => panelRefs.current['params'] = el}
                            style={{ 
                                marginBottom: '32px',
                                animation: 'fadeIn 0.5s ease'
                            }}
                        >
                            <Typography.Title 
                                heading={5} 
                                style={{ 
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: 'var(--semi-color-yellow-6)'
                                }}
                            >
                                <IconSetting style={{ color: 'var(--semi-color-yellow-6)' }} />
                                参数
                            </Typography.Title>
                            <ContentBlock 
                                title="内容"
                                content={requestProps}
                                index="params"
                                copiedStates={copiedStates}
                                handleCopy={handleCopy}
                                type="params"
                            />
                        </div>

                        {/* 对话内容 */}
                        {messages.map((message, index) => (
                            <div
                                key={`conv-${index}`}
                                ref={el => panelRefs.current[`conv-${index}`] = el}
                                style={{ 
                                    marginBottom: '24px',
                                    animation: 'fadeIn 0.5s ease',
                                    animationDelay: `${index * 0.1}s`
                                }}
                            >
                                <Typography.Title 
                                    heading={5} 
                                    style={{ 
                                        marginBottom: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        color: message.role === 'user' 
                                            ? 'var(--semi-color-blue-6)'
                                            : message.role === 'assistant'
                                            ? 'var(--semi-color-purple-6)'
                                            : message.role === 'system'
                                            ? 'var(--semi-color-cyan-6)'
                                            : message.role === 'tool'
                                            ? 'var(--semi-color-orange-6)'
                                            : 'var(--semi-color-text-0)'
                                    }}
                                >
                                    {message.role === 'user' ? (
                                        <IconUser style={{ color: 'var(--semi-color-blue-6)' }} />
                                    ) : message.role === 'assistant' ? (
                                        <IconSmartphoneStroked style={{ color: 'var(--semi-color-purple-6)' }} />
                                    ) : message.role === 'system' ? (
                                        <IconTerminal style={{ color: 'var(--semi-color-cyan-6)' }} />
                                    ) : message.role === 'tool' ? (
                                        <IconBrackets style={{ color: 'var(--semi-color-orange-6)' }} />
                                    ) : (
                                        <IconBrackets style={{ color: 'var(--semi-color-text-2)' }} />
                                    )}
                                    {message.role}
                                </Typography.Title>
                                <ContentBlock 
                                    title="内容"
                                    content={message.content}
                                    index={`conv-${index}`}
                                    copiedStates={copiedStates}
                                    handleCopy={handleCopy}
                                    type={message.role}
                                />
                                {message.otherProps && (
                                    <ContentBlock 
                                        title="其他属性"
                                        content={message.otherProps}
                                        index={`conv-${index}-props`}
                                        copiedStates={copiedStates}
                                        handleCopy={handleCopy}
                                        style={{ marginTop: '16px' }}
                                        type={message.role}
                                    />
                                )}
                            </div>
                        ))}

                        {/* AI响应内容 */}
                        <div
                            ref={el => panelRefs.current['response'] = el}
                            style={{ 
                                marginBottom: '32px',
                                animation: 'fadeIn 0.5s ease'
                            }}
                        >
                            <Typography.Title 
                                heading={5} 
                                style={{ 
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: 'var(--semi-color-green-6)'
                                }}
                            >
                                <IconArticle style={{ color: 'var(--semi-color-green-6)' }} />
                                AI响应
                            </Typography.Title>
                            <ContentBlock 
                                title="内容"
                                content={response}
                                index="response"
                                copiedStates={copiedStates}
                                handleCopy={handleCopy}
                                type="response"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

// 内容块组件
const ContentBlock = ({ title, content, index, copiedStates, handleCopy, style, type = 'default' }) => {
    const [viewMode, setViewMode] = useState('formatted');
    const [isHovered, setIsHovered] = useState(false);

    // 根据类型获取背景色
    const getBackgroundColor = () => {
        switch(type) {
            case 'user':
                return 'rgba(var(--semi-blue-0), 0.6)';
            case 'assistant':
                return 'rgba(var(--semi-purple-0), 0.6)';
            case 'system':
                return 'rgba(var(--semi-cyan-0), 0.6)';
            case 'tool':
                return 'rgba(var(--semi-orange-0), 0.6)';
            case 'response':
                return 'rgba(var(--semi-green-0), 0.6)';
            case 'params':
                return 'rgba(var(--semi-yellow-0), 0.6)';
            default:
                return 'var(--semi-color-bg-0)';
        }
    };

    const renderContent = () => {
        if (viewMode === 'raw') {
            return typeof content === 'object' ? 
                JSON.stringify(content) : 
                String(content);
        }

        return Array.isArray(content) ? (
            // 处理数组类型的内容
            content.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                    {item.type === 'text' && (
                        <pre style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            margin: 0
                        }}>
                            {item.text}
                        </pre>
                    )}
                    {item.type === 'image' && (
                        <Image
                            src={item.url}
                            alt="Content image"
                            preview={true}
                            style={{ maxWidth: '100%', height: 'auto', marginTop: '8px' }}
                        />
                    )}
                </React.Fragment>
            ))
        ) : (
            // 处理非数组类型的内容
            <pre style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0
            }}>
                {typeof content === 'object' ? 
                    JSON.stringify(content, null, 2) : 
                    String(content)}
            </pre>
        );
    };

    // 根据类型获取文字颜色
    const getTextColor = () => {
        switch(type) {
            case 'user':
                return 'var(--semi-color-blue-6)';
            case 'assistant':
                return 'var(--semi-color-purple-6)';
            case 'system':
                return 'var(--semi-color-cyan-6)';
            case 'tool':
                return 'var(--semi-color-orange-6)';
            case 'response':
                return 'var(--semi-color-green-6)';
            case 'params':
                return 'var(--semi-color-yellow-6)';
            default:
                return 'var(--semi-color-text-0)';
        }
    };

    return (
        <div 
            style={{
                backgroundColor: getBackgroundColor(),
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--semi-color-border)',
                position: 'relative',
                transition: 'all 0.3s ease',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 2px 6px rgba(0, 0, 0, 0.05)',
                ...style
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 标题和工具栏 */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
            }}>
                {title && (
                    <Typography.Text strong style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        lineHeight: 1,
                        height: '20px',
                        color: getTextColor()
                    }}>
                        <IconArticle style={{
                            verticalAlign: 'middle',
                            fontSize: '16px',
                            color: getTextColor()
                        }} />
                        {title}
                    </Typography.Text>
                )}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    opacity: isHovered ? 1 : 0.7,
                    transition: 'opacity 0.3s ease'
                }}>
                    <Button
                        icon={<IconCode />}
                        onClick={() => setViewMode(prev => prev === 'formatted' ? 'raw' : 'formatted')}
                        theme="borderless"
                        size="small"
                        style={{
                            color: viewMode === 'raw' ? 'var(--semi-color-primary)' : undefined,
                            transition: 'all 0.3s ease',
                            transform: isHovered ? 'scale(1.05)' : 'none'
                        }}
                    >
                        {viewMode === 'formatted' ? '查看原始' : '查看格式化'}
                    </Button>
                    <Button
                        icon={copiedStates[index] ? <IconTickCircle /> : <IconCopy />}
                        onClick={() => handleCopy(content, index)}
                        theme="borderless"
                        size="small"
                        style={{
                            transition: 'all 0.3s ease',
                            transform: isHovered ? 'scale(1.05)' : 'none'
                        }}
                    />
                </div>
            </div>
            
            {/* 内容区域 */}
            <div style={{
                maxHeight: '800px',
                overflowY: 'auto',
                scrollBehavior: 'smooth',
                padding: '8px',
                backgroundColor: 'var(--semi-color-bg-0)',
                borderRadius: '4px',
                transition: 'all 0.3s ease'
            }}>
                {renderContent()}
            </div>
        </div>
    );
};

export default ModalContent;
