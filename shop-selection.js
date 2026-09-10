document.addEventListener('DOMContentLoaded', async () => {
    const formatPrice = (value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
    const renderPrice = (element, product) => {
        if (!element) return;
        element.classList.toggle('sale-price', product.discountPercent > 0);
        element.innerHTML = product.discountPercent > 0
            ? `<span class="old-price">${formatPrice(product.originalPrice)}</span><strong>${formatPrice(product.price)}</strong><span class="discount-badge">-${product.discountPercent}%</span>`
            : formatPrice(product.price);
    };
    const liveProducts = new Map();
    try {
        const products = await apiRequest('/products');
        products.forEach((product) => liveProducts.set(product.id, product));
    } catch (error) {
        console.warn('Live product pricing unavailable:', error.message);
    }
    document.querySelectorAll('.product-variant').forEach((select) => {
        const card = select.closest('.product-card');
        const image = document.getElementById(select.dataset.imageTarget);
        const price = document.getElementById(select.dataset.priceTarget);
        const pickButton = card ? card.querySelector('.product-pick, a[href*="product.html"]') : null;
        const product = card ? liveProducts.get(card.dataset.productId) : null;
        const updateSelection = () => {
            const option = select.options[select.selectedIndex];
            if (image) { image.src = option.value; image.alt = option.textContent; }
            if (product) renderPrice(price, product);
            else if (price) price.textContent = option.dataset.price || price.textContent;
            if (pickButton && card.dataset.productId) pickButton.href = `product.html?product=${card.dataset.productId}&variant=${encodeURIComponent(option.value)}`;
        };
        if (product) {
            renderPrice(price, product);
            const availability = document.createElement('small');
            availability.className = 'stock-note';
            availability.textContent = product.available ? (product.lowStock ? 'Low stock' : 'In stock') : 'Currently unavailable';
            price?.parentElement.appendChild(availability);
            if (pickButton && !product.available) pickButton.classList.add('is-unavailable');
        }
        select.addEventListener('change', updateSelection);
        updateSelection();
    });
});
