document.querySelectorAll('.product-variant').forEach((select) => {
    const card = select.closest('.product-card');
    const image = document.getElementById(select.dataset.imageTarget);
    const price = document.getElementById(select.dataset.priceTarget);
    const pickButton = card ? card.querySelector('.product-pick') : null;

    const updateSelection = () => {
        const option = select.options[select.selectedIndex];
        if (image) {
            image.src = option.value;
            image.alt = option.textContent;
        }
        if (price) {
            price.textContent = option.dataset.price || price.textContent;
        }
        if (pickButton && card.dataset.productId) {
            pickButton.href = `product.html?product=${card.dataset.productId}&variant=${encodeURIComponent(option.value)}`;
        }
    };

    select.addEventListener('change', updateSelection);
    updateSelection();
});
