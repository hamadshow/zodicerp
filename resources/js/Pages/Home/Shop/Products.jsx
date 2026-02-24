import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Header from '../Components/Header.jsx';
import Footer from '../Components/Footer.jsx';
import { debounce } from 'lodash';
import ProductCard from '../Components/ProductCard.jsx';

// Import styles
import '../../../../css/homepage/main.scss';

const CategoryTreeItem = ({ category, selectedSlugs, onToggle, level = 0 }) => {
    const hasChildren = category.children && category.children.length > 0;
    const [isOpen, setIsOpen] = useState(false);

    const isChecked = selectedSlugs.includes(category.slug);

    // Auto-expand if current category or one of its children is selected
    useEffect(() => {
        if (isChecked) {
            setIsOpen(true);
        } else if (hasChildren) {
            const hasSelectedChild = (cat) => {
                if (!cat.children) return false;
                return cat.children.some(child => selectedSlugs.includes(child.slug) || hasSelectedChild(child));
            };
            if (hasSelectedChild(category)) {
                setIsOpen(true);
            }
        }
    }, [isChecked, hasChildren, selectedSlugs, category]);

    const handleExpandClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen(prev => !prev);
    };

    const handleCheckboxChange = () => {
        // Prevent unchecking if it's the last remaining selection to enforce "No return to All Categories"
        if (isChecked && selectedSlugs.length <= 1) {
            return;
        }
        onToggle(category.slug);
    };

    return (
        <div className="category-tree-item" style={{ '--level': level }}>
            <div className={`category-row ${isChecked ? 'active-row' : ''}`}>
                <div className="category-content">
                    {hasChildren && (
                        <button 
                            type="button"
                            className={`expand-btn ${isOpen ? 'open' : ''}`}
                            onClick={handleExpandClick}
                        >
                            <i className={`fas fa-${isOpen ? 'minus' : 'plus'}`}></i>
                        </button>
                    )}
                    
                    <label className={`checkbox-label ${!hasChildren ? 'no-children' : ''}`}>
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={handleCheckboxChange}
                        />
                        <span className="checkmark" />
                        <span className={`category-name ${isChecked ? 'font-bold text-blue-600' : ''}`}>
                            {category.name}
                        </span>
                    </label>
                </div>
            </div>

            {hasChildren && isOpen && (
                <div className="category-children">
                    {category.children.map(child => (
                        <CategoryTreeItem
                            key={child.id}
                            category={child}
                            selectedSlugs={selectedSlugs}
                            onToggle={onToggle}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function Products({ products, categories, level2Categories, brands, attributes, filters }) {
    const [queryParams, setQueryParams] = useState({
        search: filters.search || '',
        category: filters.category ? filters.category.split(',') : [],
        min_price: filters.min_price || '',
        max_price: filters.max_price || '',
        brands: filters.brands ? filters.brands.split(',') : [],
        sort: filters.sort || 'newest',
        // Dynamic attributes handling
        ...Object.keys(filters).reduce((acc, key) => {
            if (key.startsWith('attr_')) {
                acc[key] = filters[key].split(',');
            }
            return acc;
        }, {})
    });
    const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);

    const subcategoryRef = useRef(null);
    
    // عرض سلايدر التصنيفات الفرعية فقط عند وجود تصنيفات فرعية لواحد من الـ main categories المحددة
    const displayedCategories = useMemo(() => {
        const activeCategorySlugs = queryParams.category
            ? Array.isArray(queryParams.category)
                ? queryParams.category
                : [queryParams.category]
            : [];

        if (activeCategorySlugs.length === 0) {
            return [];
        }

        const selectedParentIds = categories
            .filter(c => activeCategorySlugs.includes(c.slug))
            .map(c => c.id);

        if (selectedParentIds.length === 0) {
            return [];
        }

        let allLevel2 = [];

        if (level2Categories && level2Categories.length > 0) {
            allLevel2 = level2Categories;
        } else {
            allLevel2 = categories.reduce((acc, cat) => {
                if (cat.children && cat.children.length > 0) {
                    return [...acc, ...cat.children];
                }
                return acc;
            }, []);
        }

        const filtered = allLevel2.filter(cat => selectedParentIds.includes(cat.parent_id));
        return filtered;
    }, [level2Categories, categories, queryParams.category]);

    const handleScroll = (direction) => {
        if (!subcategoryRef.current) return;
        subcategoryRef.current.scrollBy({
            left: direction * 200,
            behavior: 'smooth',
        });
    };

    // Debounced search to avoid too many requests
    const applyFilters = useCallback(
        debounce((params) => {
            const cleanParams = Object.keys(params).reduce((acc, key) => {
                if (params[key] !== '' && params[key]?.length !== 0) {
                    if (Array.isArray(params[key])) {
                        acc[key] = params[key].join(',');
                    } else {
                        acc[key] = params[key];
                    }
                }
                return acc;
            }, {});

            router.get(route('products.index'), cleanParams, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 500),
        []
    );

    useEffect(() => {
        applyFilters(queryParams);
    }, []); // يتم التشغيل مرة واحدة عند التحميل الأولي

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setQueryParams(prev => {
            const newParams = { ...prev, search: value };
            applyFilters(newParams);
            return newParams;
        });
    };

    const handleCategoryChange = (slug) => {
        setQueryParams(prev => {
            const current = Array.isArray(prev.category) ? prev.category : [];
            const next = current.includes(slug)
                ? current.filter(item => item !== slug)
                : [...current, slug];
            const newParams = { ...prev, category: next };
            applyFilters(newParams);
            return newParams;
        });
    };

    const handlePriceChange = (e) => {
        const { name, value } = e.target;
        setQueryParams(prev => {
            const newParams = { ...prev, [name]: value };
            applyFilters(newParams);
            return newParams;
        });
    };

    const handleBrandChange = (slug) => {
        setQueryParams(prev => {
            const newBrands = prev.brands.includes(slug)
                ? prev.brands.filter(b => b !== slug)
                : [...prev.brands, slug];
            
            const newParams = { ...prev, brands: newBrands };
            applyFilters(newParams);
            return newParams;
        });
    };

    const handleAttributeChange = (attrSlug, optionSlug) => {
        const key = `attr_${attrSlug}`;
        setQueryParams(prev => {
            const currentOptions = prev[key] || [];
            const newOptions = currentOptions.includes(optionSlug)
                ? currentOptions.filter(o => o !== optionSlug)
                : [...currentOptions, optionSlug];
            
            const newParams = { ...prev, [key]: newOptions };
            applyFilters(newParams);
            return newParams;
        });
    };

    const handleSortChange = (e) => {
        const value = e.target.value;
        setQueryParams(prev => {
            const newParams = { ...prev, sort: value };
            applyFilters(newParams);
            return newParams;
        });
    };

    const clearFilters = () => {
        setQueryParams({
            search: '',
            category: [],
            min_price: '',
            max_price: '',
            brands: [],
            sort: 'newest'
        });
        router.get(route('products.index'));
    };

    const getProductCardData = (product) => {
        const moqValue = product.minimum_order_quantity
            ? `${product.minimum_order_quantity} pcs`
            : '1 pc';
        return {
            ...product,
            sale_price: product.discount_price,
            moq: product.moq || moqValue,
            orders: product.orders || (product.views ? `${product.views} Views` : '0'),
            supplier: product.supplier || product.brand || 'ZodiMarket',
            verified: product.verified ?? true,
            badge: product.badge || (product.is_sale ? 'Sale' : product.is_new ? 'New' : null)
        };
    };

    // Filter categories to show only the active hierarchy
    const visibleCategories = useMemo(() => {
        const selectedSlugs = Array.isArray(queryParams.category) ? queryParams.category : (queryParams.category ? [queryParams.category] : []);
        
        if (selectedSlugs.length === 0) return categories;

        // Helper to check if a category or any of its descendants is selected
        const isCategoryOrDescendantSelected = (cat) => {
            if (selectedSlugs.includes(cat.slug)) return true;
            if (cat.children && cat.children.length > 0) {
                return cat.children.some(child => isCategoryOrDescendantSelected(child));
            }
            return false;
        };

        // Filter root categories: keep only those that are selected or have selected descendants
        const filtered = categories.filter(cat => isCategoryOrDescendantSelected(cat));
        
        // If we found matching categories, return only them.
        return filtered.length > 0 ? filtered : categories;
    }, [categories, queryParams.category]);

    return (
        <div className="app-layout homepage-layout products-page">
            <Head title="Shop Products" />
            <Header />
            
            <main className="products-main">
                <div className="container">
                    <div className="products-layout">
                        {/* Sidebar Filters */}
                        <aside className="products-sidebar">
                            <div className="sidebar-header">
                                <h3>Filters</h3>
                                {/* Clear All button removed to prevent returning to All Categories */}
                            </div>

                            {/* Search */}
                            <div className="filter-group search-filter">
                                <div className="search-input-wrapper">
                                    <i className="fas fa-search"></i>
                                    <input 
                                        type="text" 
                                        placeholder="Search products..." 
                                        value={queryParams.search}
                                        onChange={handleSearchChange}
                                    />
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="filter-group categories-filter">
                                <div className="filter-group-header">
                                    <h4>Category</h4>
                                    <div className="filter-group-actions">
                                        <button
                                            type="button"
                                            className="category-collapse-btn"
                                            aria-expanded={isCategoriesOpen}
                                            onClick={() =>
                                                setIsCategoriesOpen(prev => !prev)
                                            }
                                        >
                                            {isCategoriesOpen ? '˄' : '˅'}
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className={`filter-content ${
                                        isCategoriesOpen ? 'open' : 'collapsed'
                                    } category-tree-container`}
                                >
                                    {visibleCategories.map(category => (
                                        <CategoryTreeItem
                                            key={category.id}
                                            category={category}
                                            selectedSlugs={Array.isArray(queryParams.category) ? queryParams.category : []}
                                            onToggle={handleCategoryChange}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div className="filter-group price-filter">
                                <h4>Price Range</h4>
                                <div className="price-inputs">
                                    <input 
                                        type="number" 
                                        name="min_price" 
                                        placeholder="Min" 
                                        value={queryParams.min_price}
                                        onChange={handlePriceChange}
                                    />
                                    <span>-</span>
                                    <input 
                                        type="number" 
                                        name="max_price" 
                                        placeholder="Max" 
                                        value={queryParams.max_price}
                                        onChange={handlePriceChange}
                                    />
                                </div>
                            </div>

                            {/* Brands */}
                            {brands.length > 0 && (
                                <div className="filter-group brands-filter">
                                    <h4>Brands</h4>
                                    <div className="filter-content scrollable">
                                        {brands.map(brand => (
                                            <label key={brand.id} className="checkbox-label">
                                                <input 
                                                    type="checkbox" 
                                                    checked={queryParams.brands.includes(brand.slug)}
                                                    onChange={() => handleBrandChange(brand.slug)}
                                                />
                                                <span className="checkmark"></span>
                                                <span className="label-text">{brand.name}</span>
                                                <span className="count">({brand.products_count})</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dynamic Attributes */}
                            {attributes.map(attr => (
                                <div key={attr.id} className="filter-group attribute-filter">
                                    <h4>{attr.name}</h4>
                                    <div className={`filter-content ${attr.type === 'color' ? 'color-options' : 'scrollable'}`}>
                                        {attr.options.map(option => (
                                            attr.type === 'color' ? (
                                                <button
                                                    key={option.id}
                                                    className={`color-swatch ${queryParams[`attr_${attr.slug}`]?.includes(option.slug) ? 'selected' : ''}`}
                                                    style={{ backgroundColor: option.value }}
                                                    onClick={() => handleAttributeChange(attr.slug, option.slug)}
                                                    title={option.name}
                                                />
                                            ) : (
                                                <label key={option.id} className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={queryParams[`attr_${attr.slug}`]?.includes(option.slug)}
                                                        onChange={() => handleAttributeChange(attr.slug, option.slug)}
                                                    />
                                                    <span className="checkmark"></span>
                                                    <span className="label-text">{option.name}</span>
                                                </label>
                                            )
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </aside>

                        {/* Main Content */}
                        <div className="products-content">
                            {/* Level 2 Categories Slider */}
                            {displayedCategories.length > 0 && (
                                <div className="subcategory-section mb-4">
                                    <div className="subcategory-slider-container">
                                        <button className="slider-nav left" type="button" onClick={() => handleScroll(-1)}>
                                            <i className="fas fa-chevron-left"></i>
                                        </button>
                                        <div className="subcategory-track" ref={subcategoryRef}>
                                            {displayedCategories.map(cat => (
                                                <div 
                                                    key={cat.id} 
                                                    className={`subcategory-item ${queryParams.category.includes(cat.slug) ? 'active' : ''}`}
                                                    onClick={() => handleCategoryChange(cat.slug)}
                                                >
                                                    <div className="subcategory-avatar">
                                                        <img 
                                                            src={cat.image || 'https://via.placeholder.com/60?text=' + (cat.name ? cat.name.charAt(0) : 'C')} 
                                                            alt={cat.name} 
                                                            loading="lazy" 
                                                            onError={(e) => {
                                                                e.target.onerror = null; 
                                                                e.target.src = 'https://via.placeholder.com/60?text=' + (cat.name ? cat.name.charAt(0) : 'C');
                                                            }} 
                                                        />
                                                    </div>
                                                    <span>{cat.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="slider-nav right" type="button" onClick={() => handleScroll(1)}>
                                            <i className="fas fa-chevron-right"></i>
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {/* Toolbar */}
                            <div className="products-toolbar">
                                <div className="results-count">
                                    Showing {products.from || 0}-{products.to || 0} of {products.total} results
                                </div>
                                <div className="sort-wrapper">
                                    <label>Sort by:</label>
                                    <select value={String(queryParams.sort || 'newest')} onChange={handleSortChange}>
                                        <option value="newest">Newest Arrivals</option>
                                        <option value="price_low">Price: Low to High</option>
                                        <option value="price_high">Price: High to Low</option>
                                        <option value="name_asc">Name: A-Z</option>
                                        <option value="name_desc">Name: Z-A</option>
                                    </select>
                                </div>
                            </div>

                            {/* Product Grid */}
                            {products.data.length > 0 ? (
                                <div className="products-grid">
                                    {products.data.map(product => (
                                        <ProductCard key={product.id} product={getProductCardData(product)} />
                                    ))}
                                </div>
                            ) : (
                                <div className="no-products-found">
                                    <i className="fas fa-search"></i>
                                    <h3>No products found</h3>
                                    <p>Try adjusting your filters or search criteria.</p>
                                    <button onClick={clearFilters} className="btn-primary">Clear All Filters</button>
                                </div>
                            )}

                            {/* Pagination */}
                            {products.links && products.links.length > 3 && (
                                <div className="pagination">
                                    {products.links.map((link, index) => (
                                        link.url ? (
                                            <Link
                                                key={index}
                                                href={link.url}
                                                className={`pagination-link ${link.active ? 'active' : ''}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ) : (
                                            <span
                                                key={index}
                                                className="pagination-link disabled"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        )
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
