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
        const pickButton = card ? card.querySelector('.product-pick, a[href*="product.html"], .btn-outline') : null;
        const product = card ? liveProducts.get(card.dataset.productId) : null;
        if (product) {
            select.innerHTML = product.options.map((option) => `<option value="${option.image.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"${option.available ? '' : ' disabled'}>${option.label}${option.available ? '' : ' - unavailable'}</option>`).join('');
            const firstAvailable = product.options.findIndex((option) => option.available);
            select.selectedIndex = firstAvailable >= 0 ? firstAvailable : 0;
        }
        const availability = product ? document.createElement('small') : null;
        if (availability) {
            availability.className = 'stock-note';
            price?.parentElement.appendChild(availability);
        }
        const updateSelection = () => {
            const option = select.options[select.selectedIndex];
            const liveOption = product?.options.find((item) => item.image === option.value);
            if (image) { image.src = option.value; image.alt = option.textContent; }
            if (product) renderPrice(price, product);
            else if (price) price.textContent = option.dataset.price || price.textContent;
            if (pickButton && card.dataset.productId) pickButton.href = `product.html?product=${card.dataset.productId}&variant=${encodeURIComponent(option.value)}`;
            if (availability) {
                availability.textContent = liveOption?.available ? (liveOption.lowStock ? 'Low stock' : 'In stock') : 'Currently unavailable';
                pickButton?.classList.toggle('is-unavailable', !liveOption?.available);
            }
        };
        if (product) {
            renderPrice(price, product);
        }
        select.addEventListener('change', updateSelection);
        updateSelection();
    });
});
