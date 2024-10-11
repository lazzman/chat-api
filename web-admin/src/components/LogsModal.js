import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Collapse, Image, Typography } from '@douyinfe/semi-ui';
import { IconChevronDown, IconCopy, IconTickCircle } from '@douyinfe/semi-icons';

const ModalContent = ({ content }) => {
    // 用于存储每个面板复制状态的状态
    const [copiedStates, setCopiedStates] = useState({});
    // 用于引用每个折叠面板的DOM节点
    const panelRefs = useRef([]);
    // 当前活动面板的索引
    const [activePanel, setActivePanel] = useState(null);

    // 使用 useMemo 优化复杂数据处理逻辑，避免在每次渲染时都进行重新计算
    const result = useMemo(() => {
        try {
            // 将内容分解为块，每个块中的逻辑属于某个特定的角色
            const lines = content.split('\n');
            let currentRole = '';
            let currentContent = [];
            const blocks = [];

            lines.forEach((line) => {
                if (line.startsWith('【系统】：') || line.startsWith('【用户】：') || line.startsWith('【AI】：') || line.startsWith('【参数】：')) {
                    if (currentRole && currentContent.length > 0) {
                        blocks.push({ role: currentRole, content: currentContent.join('\n').trim() });
                        currentContent = [];
                    }
                    currentRole = line.split(':')[0].replace('【', '').replace('】', '');
                    currentContent.push(line.split(':').slice(1).join(':').trim());
                } else {
                    currentContent.push(line);
                }
            });

            if (currentRole && currentContent.length > 0) {
                blocks.push({ role: currentRole, content: currentContent.join('\n').trim() });
            }

            if (blocks.length <= 0) {
                return null;
            }

            // 将第一块内容转化为JSON对象，并构建返回的结果数组
            const firstBlockContent = JSON.parse(blocks[0].content);
            const { messages, ...rest } = firstBlockContent;
            const result = [
                { role: '参数', content: JSON.stringify(rest, null, 2).trim() },
                ...(Array.isArray(messages) ? messages.map(message => {
                    const { role, content, ...otherProps } = message;
                    return {
                        role,
                        content: Array.isArray(content)
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
                            : [{ type: 'text', text: content?.trim() || '' }],
                        otherProps: Object.keys(otherProps).length > 0 ? JSON.stringify(otherProps, null, 2) : null
                    };
                }) : []),
                ...(blocks.length > 1 ? [blocks[blocks.length - 1]] : [])
            ];

            return result;
        } catch (error) {
            console.error('JSON 解析错误:', error);
            return [];
        }
    }, [content]);

    // 设置默认展开的面板
    const defaultActiveKeys = result.map((_, index) => `${index}`);

    useEffect(() => {
        // 监听滚动事件，用于检测当前激活的面板
        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            let active = null;
            panelRefs.current.forEach((ref, index) => {
                if (ref && ref.offsetTop <= scrollPosition + 100) {
                    active = index;
                }
            });
            setActivePanel(active);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 滚动到特定面板功能
    const scrollToPanel = (index) => {
        const panel = panelRefs.current[index];
        if (panel && panel.scrollIntoView) {
            panel.scrollIntoView({ behavior: 'smooth' });
            setActivePanel(index);
        }
    };

    // 复制面板内容到剪贴板的功能
    const handleCopy = useCallback((content, index) => {
        const textContent = content.map(item => {
            if (item.type === 'text') {
                return item.text;
            } else if (item.type === 'image') {
                return `[Image: ${item.url}]`;
            }
            return '';
        }).join('\n');

        navigator.clipboard.writeText(textContent).then(() => {
            setCopiedStates(prev => ({ ...prev, [index]: true }));
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [index]: false }));
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }, []);

    // 渲染面板内容
    const renderContent = useMemo(() => (content, index) => {
        const contentArray = Array.isArray(content) ? content : [{ type: 'text', text: content }];

        const contentStyle = {
            backgroundColor: 'var(--semi-color-fill-0)',
            padding: '16px',
            paddingRight: '40px',
            borderRadius: '6px',
            position: 'relative'
        };

        const textStyle = {
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '14px',
            marginBottom: '16px'
        };

        return (
            <div style={contentStyle}>
                {contentArray.map((item, itemIndex) => {
                    if (item.type === 'text') {
                        return (
                            <pre key={itemIndex} style={textStyle}>
                                {item.text}
                            </pre>
                        );
                    } else if (item.type === 'image') {
                        return (
                            <div key={itemIndex} style={{ marginBottom: '16px' }}>
                                <Image
                                    src={item.url}
                                    alt="Content image"
                                    preview={true}
                                    style={{ maxWidth: '100%', height: 'auto' }}
                                />
                            </div>
                        );
                    }
                    return null;
                })}
                <Button
                    icon={copiedStates[index] ? <IconTickCircle /> : <IconCopy />}
                    theme="borderless"
                    size="small"
                    style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        zIndex: 1,
                        color: 'var(--semi-color-text-2)'
                    }}
                    aria-label={copiedStates[index] ? "已复制" : "复制内容"}
                    onClick={() => handleCopy(contentArray, index)}
                />
            </div>
        );
    }, [copiedStates, handleCopy]);

    return (
        <React.Fragment>
            <NavigationPanel result={result} activePanel={activePanel} scrollToPanel={scrollToPanel} />
            <Collapse defaultActiveKey={defaultActiveKeys} expandIcon={<IconChevronDown />}>
                {result.map((block, index) => (
                    <CollapsePanelItem
                        key={index}
                        block={block}
                        index={index}
                        panelRef={el => panelRefs.current[index] = el}
                        renderContent={renderContent}
                        copiedStates={copiedStates}
                        handleCopy={handleCopy}
                    />
                ))}
            </Collapse>
        </React.Fragment>
    );
};

// 导航面板，用于快速跳转到特定面板
const NavigationPanel = React.memo(({ result, activePanel, scrollToPanel }) => {
    const panelStyle = {
        position: 'fixed',
        left: '4px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '10px',
        maxHeight: '80vh',
        overflowY: 'auto',
        width: '120px',
    };

    return (
        <div style={panelStyle}>
            {result.map((block, index) => (
                <NavigationItem
                    key={index}
                    block={block}
                    index={index}
                    isActive={activePanel === index}
                    onClick={() => scrollToPanel(index)}
                />
            ))}
        </div>
    );
});

// 导航项，表示导航面板中的一个可点击元素
const NavigationItem = React.memo(({ block, index, isActive, onClick }) => {
    const itemStyle = {
        display: 'flex',
        alignItems: 'center',
        margin: '4px 0',
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: isActive ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
        transition: 'all 0.3s ease',
        width: '100%',
    };

    const circleStyle = {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: isActive ? 'red' : 'var(--semi-color-text-2)',
        marginRight: '8px',
        flexShrink: 0,
        transition: 'all 0.3s ease'
    };

    const textStyle = {
        fontSize: '14px',
        fontWeight: isActive ? 'bold' : 'normal',
        color: isActive ? 'red' : 'var(--semi-color-text-2)',
        transition: 'all 0.3s ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flexGrow: 1,
    };

    return (
        <div style={itemStyle} onClick={onClick}>
            <div style={circleStyle} />
            <span style={textStyle}>
                {block.role}
            </span>
        </div>
    );
});

// 折叠面板项，包含每个面板的内容显示和其他属性
const CollapsePanelItem = React.memo(({ block, index, panelRef, renderContent, copiedStates, handleCopy }) => {
    return (
        <Collapse.Panel
            header={
                <Typography.Text
                    strong
                    style={{
                        color: 'var(--semi-color-primary)',
                        fontSize: '16px'
                    }}
                >
                    {block.role}
                </Typography.Text>
            }
            itemKey={`${index}`}
        >
            <div ref={panelRef}>
                {renderContent(block.content, index)}
                {block.otherProps && (
                    <OtherPropertiesSection
                        otherProps={block.otherProps}
                        index={index}
                        copiedStates={copiedStates}
                        handleCopy={handleCopy}
                    />
                )}
            </div>
        </Collapse.Panel>
    );
});

// 其他属性部分，显示每个面板的附加信息
const OtherPropertiesSection = React.memo(({ otherProps, index, copiedStates, handleCopy }) => {
    const sectionStyle = {
        position: 'relative',
        marginTop: '16px',
        backgroundColor: 'var(--semi-color-bg-1)',
        padding: '8px',
        borderRadius: '4px'
    };

    const preStyle = {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: '14px',
        backgroundColor: 'var(--semi-color-fill-1)',
        padding: '16px',
        borderRadius: '4px'
    };

    return (
        <div style={sectionStyle}>
            <Typography.Text strong style={{ display: 'block', marginBottom: '8px', color: 'var(--semi-color-text-1)' }}>
                其他属性:
            </Typography.Text>
            <Button
                icon={copiedStates[`others-${index}`] ? <IconTickCircle /> : <IconCopy />}
                theme="borderless"
                size="small"
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 1,
                    color: 'var(--semi-color-text-2)'
                }}
                onClick={() => handleCopy([{ type: 'text', text: otherProps }], `others-${index}`)}
            />
            <pre style={preStyle}>
                {otherProps}
            </pre>
        </div>
    );
});

export default ModalContent;
