import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import '../../../../css/homepage/main.scss';

const categoriesData = [
  {
    id: 1,
    name: 'Women Fashion',
    slug: 'women-fashion',
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=400&fit=crop',
    description: 'Dresses, tops, accessories and more for every occasion.',
  },
  {
    id: 2,
    name: 'Men Fashion',
    slug: 'men-fashion',
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=400&fit=crop',
    description: 'Casual and formal menswear for work and weekends.',
  },
  {
    id: 3,
    name: 'Electronics',
    slug: 'electronics',
    image:
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&h=400&fit=crop',
    description: 'Smartphones, laptops, audio devices and more.',
  },
  {
    id: 4,
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    image:
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=600&h=400&fit=crop',
    description: 'Essentials and decor to upgrade every room at home.',
  },
  {
    id: 5,
    name: 'Beauty',
    slug: 'beauty',
    image:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=400&fit=crop',
    description: 'Skincare, makeup and personal care bestsellers.',
  },
  {
    id: 6,
    name: 'Sports',
    slug: 'sports',
    image:
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&h=400&fit=crop',
    description: 'Fitness gear and sports equipment for an active lifestyle.',
  },
];

const Categories = () => {
  return (
    <>
      <Head title="Shop by Categories" />
      <div className="app-layout homepage-layout categories-page">
        <Header />
        <main className="categories-main">
          <div className="container">
            <div className="categories-header">
              <h1 className="categories-title">Shop by Categories</h1>
              <p className="categories-subtitle">
                Discover curated collections across fashion, electronics, home and more.
              </p>
            </div>

            <div className="categories-grid">
              {categoriesData.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  className="category-card"
                >
                  <div className="category-card-image">
                    <img src={category.image} alt={category.name} loading="lazy" />
                  </div>
                  <div className="category-card-body">
                    <h2 className="category-card-name">{category.name}</h2>
                    <p className="category-card-description">{category.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Categories;
