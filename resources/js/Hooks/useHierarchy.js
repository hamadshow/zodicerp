import { useState, useCallback, useMemo, useEffect } from 'react';

export const useHierarchy = (initialData = [], options = {}) => {
    const { onFetchChildren } = options;
    
    const [data, setData] = useState(initialData);
    const [loadingNodes, setLoadingNodes] = useState(new Set());
    const [activeNode, setActiveNode] = useState(null);
    const [selectedNodes, setSelectedNodes] = useState(new Set());
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('tree');
    const [filters, setFilters] = useState({
        status: 'all',
        type: 'all',
        level: 'all'
    });

    // Sync data state when initialData prop changes
    useEffect(() => {
        if (Array.isArray(initialData)) {
            setData(initialData);
        }
    }, [initialData]);

    const buildTree = useCallback((flatList) => {
        if (!Array.isArray(flatList) || flatList.length === 0) return [];
        
        const map = {};
        const roots = [];
        
        // First pass: Create a map of all nodes with empty children arrays
        flatList.forEach(node => {
            map[node.id] = { ...node, children: node.children || [] };
        });

        // Second pass: Link children to parents
        flatList.forEach(node => {
            const mappedNode = map[node.id];
            // If it has a parent_id and the parent exists in our map
            if (node.parent_id && map[node.parent_id]) {
                // Avoid duplicates if children were already present
                const exists = map[node.parent_id].children.some(c => c.id === node.id);
                if (!exists) {
                    map[node.parent_id].children.push(mappedNode);
                }
            } else {
                // If no parent_id or parent doesn't exist in current set, it's a root
                roots.push(mappedNode);
            }
        });

        return roots;
    }, []);

    // To fix the "no children" issue, we ensure 'data' is always a tree.
    const treeData = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return [];
        
        // Check if data is already nested
        const isAlreadyNested = data.some(node => node.children && Array.isArray(node.children) && node.children.length > 0);
        
        return isAlreadyNested ? data : buildTree(data);
    }, [data, buildTree]);

    // Sync activeNode with the tree version when data changes to ensure detail panel has latest info
    useEffect(() => {
        if (activeNode) {
            const findInTree = (nodes) => {
                for (const n of nodes) {
                    if (n.id === activeNode.id) return n;
                    if (n.children) {
                        const found = findInTree(n.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            const updatedActive = findInTree(treeData);
            if (updatedActive && updatedActive !== activeNode) {
                setActiveNode(updatedActive);
            }
        }
    }, [treeData, activeNode]);

    const toggleNode = useCallback(async (nodeId) => {
        const isExpanding = !expandedNodes.has(nodeId);
        
        if (isExpanding && onFetchChildren) {
            // Find the node in the flat list
            const findNode = (nodes) => {
                for (const node of nodes) {
                    if (node.id === nodeId) return node;
                    if (node.children) {
                        const found = findNode(node.children);
                        if (found) return found;
                    }
                }
                return null;
            };

            const node = findNode(treeData);
            
            // If node has children_count > 0 but children array is empty/undefined, fetch them
            if (node && node.children_count > 0 && (!node.children || node.children.length === 0)) {
                setLoadingNodes(prev => new Set(prev).add(nodeId));
                try {
                    const children = await onFetchChildren(nodeId);
                    if (children && Array.isArray(children)) {
                        setData(prev => [...prev, ...children]);
                    }
                } catch (error) {
                    console.error("Failed to fetch children:", error);
                } finally {
                    setLoadingNodes(prev => {
                        const next = new Set(prev);
                        next.delete(nodeId);
                        return next;
                    });
                }
            }
        }

        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, [expandedNodes, onFetchChildren, treeData]);

    const getAllChildIds = useCallback((node) => {
        let ids = [node.id];
        if (node.children) {
            node.children.forEach(child => {
                ids = [...ids, ...getAllChildIds(child)];
            });
        }
        return ids;
    }, []);

    const selectNode = useCallback((node, isMulti = false) => {
        setActiveNode(node);
        setSelectedNodes((prev) => {
            const next = isMulti ? new Set(prev) : new Set();
            const nodeAndChildIds = getAllChildIds(node);
            
            const isCurrentlySelected = next.has(node.id);
            
            nodeAndChildIds.forEach(id => {
                if (isCurrentlySelected && isMulti) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
            });
            
            return next;
        });
    }, [getAllChildIds]);

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
        return flatten(treeData);
    }, [treeData]);

    const filteredData = useMemo(() => {
        if (!searchQuery && filters.status === 'all' && filters.type === 'all') return treeData;

        const search = searchQuery.toLowerCase();
        
        const filterTree = (nodes) => {
            return nodes.reduce((acc, node) => {
                const matchesSearch = !search || 
                    node.name?.toLowerCase().includes(search) ||
                    node.code?.toLowerCase().includes(search) ||
                    node.name_json?.ar?.toLowerCase().includes(search) ||
                    node.name_json?.en?.toLowerCase().includes(search);

                const matchesStatus = filters.status === 'all' || 
                    (filters.status === 'active' && node.status) || 
                    (filters.status === 'inactive' && !node.status);

                const matchesType = filters.type === 'all' || node.type === filters.type;

                const filteredChildren = node.children ? filterTree(node.children) : [];
                
                if ((matchesSearch && matchesStatus && matchesType) || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren
                    });
                }
                return acc;
            }, []);
        };

        return filterTree(treeData);
    }, [treeData, searchQuery, filters]);

    // Auto-expand nodes when searching
    useEffect(() => {
        if (searchQuery && filteredData.length > 0) {
            const idsToExpand = new Set();
            const collectIds = (nodes) => {
                nodes.forEach(node => {
                    if (node.children && node.children.length > 0) {
                        idsToExpand.add(node.id);
                        collectIds(node.children);
                    }
                });
            };
            collectIds(filteredData);
            setExpandedNodes(prev => {
                const next = new Set(prev);
                idsToExpand.forEach(id => next.add(id));
                return next;
            });
        }
    }, [searchQuery, filteredData]);

    const breadcrumbs = useMemo(() => {
        if (!activeNode) return [];
        const nodeInFlat = flatData.find(n => n.id === activeNode.id);
        return nodeInFlat ? nodeInFlat.path : [];
    }, [activeNode, flatData]);

    return {
        data: filteredData,
        rawData: treeData,
        setData,
        activeNode,
        selectedNodes,
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
        breadcrumbs,
        loadingNodes
    };
};
