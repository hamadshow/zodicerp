import { useState, useCallback, useMemo } from 'react';

export const useHierarchy = (initialData = []) => {
    const [data, setData] = useState(initialData);
    const [selectedNode, setSelectedNode] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('tree');
    const [filters, setFilters] = useState({
        status: 'all',
        type: 'all',
        level: 'all'
    });

    const toggleNode = useCallback((nodeId) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    const selectNode = useCallback((node) => {
        setSelectedNode(node);
    }, []);

    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const expandAll = useCallback((nodes) => {
        const ids = new Set();
        const collectIds = (items) => {
            items.forEach(item => {
                if (item.children && item.children.length > 0) {
                    ids.add(item.id);
                    collectIds(item.children);
                }
            });
        };
        collectIds(nodes);
        setExpandedNodes(ids);
    }, []);

    const collapseAll = useCallback(() => {
        setExpandedNodes(new Set());
    }, []);

    // Flatten data for searching
    const flatData = useMemo(() => {
        const flatten = (nodes, level = 0, parentPath = []) => {
            return nodes.reduce((acc, node) => {
                const currentPath = [...parentPath, node];
                const flatNode = { ...node, level, path: currentPath };
                acc.push(flatNode);
                if (node.children && node.children.length > 0) {
                    acc.push(...flatten(node.children, level + 1, currentPath));
                }
                return acc;
            }, []);
        };
        return flatten(data);
    }, [data]);

    const filteredData = useMemo(() => {
        if (!searchQuery) return data;

        const search = searchQuery.toLowerCase();
        
        const filterTree = (nodes) => {
            return nodes.reduce((acc, node) => {
                const matches = 
                    node.name?.toLowerCase().includes(search) ||
                    node.code?.toLowerCase().includes(search) ||
                    node.name_json?.ar?.toLowerCase().includes(search) ||
                    node.name_json?.en?.toLowerCase().includes(search);

                const filteredChildren = node.children ? filterTree(node.children) : [];
                
                if (matches || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren
                    });
                    // Auto-expand nodes that have matches in children
                    if (filteredChildren.length > 0) {
                        setExpandedNodes(prev => new Set(prev).add(node.id));
                    }
                }
                return acc;
            }, []);
        };

        return filterTree(data);
    }, [data, searchQuery]);

    const breadcrumbs = useMemo(() => {
        if (!selectedNode) return [];
        const nodeInFlat = flatData.find(n => n.id === selectedNode.id);
        return nodeInFlat ? nodeInFlat.path : [];
    }, [selectedNode, flatData]);

    return {
        data: filteredData,
        rawData: data,
        setData,
        selectedNode,
        selectNode,
        expandedNodes,
        setExpandedNodes,
        toggleNode,
        expandAll,
        collapseAll,
        searchQuery,
        setSearchQuery,
        viewMode,
        setViewMode,
        filters,
        updateFilters,
        flatData,
        breadcrumbs
    };
};
