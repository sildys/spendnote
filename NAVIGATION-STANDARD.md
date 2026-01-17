# SpendNote Navigation Standard

## 🎯 Probléma
- Index.html inline style-okkal felülírja a main.css-t
- Különböző padding értékek
- Változó font-weight-ek (600, 700, 800, 900)
- Logo méret eltérések

## ✅ STANDARD - Minden Oldalon Egységes

### Navigation Container
```css
.site-nav {
    padding: 1rem 0;  /* 16px vertical */
    position: sticky;
    top: 0;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
}

.nav-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;  /* 32px horizontal */
}
```

### Logo
```css
.site-nav .logo svg {
    width: 44px;
    height: 44px;
}

.site-nav .logo span {
    font-size: 24px;
    font-weight: 900;  /* ALWAYS 900 */
}
```

### Navigation Links
```css
.site-nav .nav-links a {
    font-size: 15px;
    font-weight: 600;  /* ALWAYS 600 */
    color: #000000;
}
```

### Buttons
```css
.site-nav .btn {
    padding: 12px 24px;
    font-weight: 700;  /* ALWAYS 700 for buttons */
    font-size: 15px;
    border-radius: 12px;
}
```

## 📝 Action Items
1. Remove ALL inline nav styles from index.html
2. Ensure main.css rules apply everywhere
3. No !important flags needed
4. Consistent font-weight: Logo=900, Links=600, Buttons=700
