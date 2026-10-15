# Head Management

No.JS provides four reactive directives that update `<head>` elements from body
markup — useful for product pages, landing pages, and any route that is not
managed by the SPA router.

> **Routing use case:** If you are using `<template route>`, prefer the
> [`page-title`, `page-description`, `page-canonical`, and `page-jsonld`
> attributes on the template element](routing.md#route-head-attributes) —
> they are more declarative and do not require extra elements in the body.

---

## Placement

Place the directive on a `<div hidden>` element anywhere in the page body (not
inside `<head>`). The element is invisible and semantically neutral:

```html
<div hidden page-title="product.name + ' | My Store'"></div>
<div hidden page-description="product.description"></div>
<div hidden page-canonical="'/products/' + product.slug"></div>
<div hidden page-jsonld>{"@type":"Product","name":"{product.name}","price":"{product.price}"}</div>
```

All directives are reactive — they re-apply whenever the surrounding state
changes.

---

## `page-title`

Updates `document.title`.

```html
<!-- Static string -->
<div hidden page-title="'About Us | My Store'"></div>

<!-- Expression against local state -->
<div state='{"name":"Sneaker X"}'>
  <div hidden page-title="name + ' | Store'"></div>
</div>
```

The value is a No.JS expression. Any expression that evaluates to a non-null
value sets the title.

---

## `page-description`

Creates or updates `<meta name="description" content="...">` in `<head>`.

```html
<div hidden page-description="product.description"></div>

<!-- Static -->
<div hidden page-description="'The best sneakers online'"></div>
```

If a `<meta name="description">` already exists (e.g. set server-side), it is
updated in place — no duplicate is created.

---

## `page-canonical`

Creates or updates `<link rel="canonical" href="...">` in `<head>`.

```html
<div hidden page-canonical="'/products/' + product.slug"></div>

<!-- Static -->
<div hidden page-canonical="'https://mystore.com/about'"></div>
```

The value is a No.JS expression evaluated to a URL string. If a canonical link
already exists, it is updated in place.

---

## `page-jsonld`

Creates or updates `<script type="application/ld+json" data-nojs>` in `<head>`.

Unlike the other three directives, the JSON-LD template is written as the
**body of the element**, not as the attribute value. Use `{expression}`
placeholders for dynamic values:

```html
<div hidden page-jsonld>
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "{product.name}",
    "description": "{product.description}",
    "offers": {
      "@type": "Offer",
      "price": "{product.price}",
      "priceCurrency": "USD"
    }
  }
</div>
```

> **Note:** `<script>` elements are skipped by No.JS processing. Always use
> `<div hidden page-jsonld>` as the host element.

> **Warning — untrusted data:** by default a value in a quoted placeholder can
> still end the JSON string and add or override keys, exactly as in v1.21.1.
> With `q = 'x","@type":"Organization'`, the template
> `{"@type":"SearchResultsPage","name":"{q}"}` produces
> `"@type":"Organization"`. If any placeholder carries data you do not control
> (route params, `$route.query`, user input, third-party API content), set
> `NoJS.config({ strictJsonld: true })`.

**Placeholder escaping (default).** `page-jsonld` produces exactly the
v1.21.1 output: each placeholder is replaced with its value as text (`null`,
`undefined` and expression errors become an empty string), with no escaping.
Raw placeholders (`"offers":{offersJson}`, `"author":{JSON.stringify(author)}`),
values that were pre-escaped for JSON and patterns such as
`"sameAs":["{list.join('","')}"]` keep working unchanged. A value with `"`, `\`
or a line break in a quoted placeholder (for example a product name such as
`27" Monitor`) still makes the output invalid JSON, as in v1.21.1; search
engines then ignore the block. `</` is written as `<\/`, so a value can never
close the `<script>` element.

**`strictJsonld: true`.** Every placeholder inside a JSON string is escaped as
JSON string content, so its value is always data: it cannot end the string or
add keys, and a `"`, `\` or line break in it no longer makes the output invalid
JSON. `<` in every value is written as `\u003c`, which keeps the data
unchanged and keeps the block intact when the page HTML is serialized (for
example by a prerender service). Two v1.21.1 patterns change meaning in this
mode:

- Values pre-escaped for JSON are escaped again (`Say \"hi\"` keeps its
  backslashes).
- `"sameAs":["{list.join('","')}"]` yields one string. Use
  `"sameAs":{JSON.stringify(list)}` instead.

Placeholders outside a string are still inserted as-is in strict mode. They are
meant for trusted, pre-serialized JSON: never put untrusted data in them
directly. `{JSON.stringify(value)}` in a raw position (for example
`"name":{JSON.stringify($route.query.q)}`) always produces a single JSON value,
in both modes.

The `data-nojs` marker distinguishes the managed tag from any hand-written
JSON-LD blocks already in `<head>` — they coexist safely.

### Full product page example

```html
<div state='{"product": null}'>
  <div get="/api/products/{slug}" as="product"></div>

  <div hidden page-title="product.name + ' | My Store'"></div>
  <div hidden page-description="product.description"></div>
  <div hidden page-canonical="'/products/' + product.slug"></div>
  <div hidden page-jsonld>
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "{product.name}",
      "offers": {"@type":"Offer","price":"{product.price}","priceCurrency":"USD"}
    }
  </div>

  <h1 bind="product.name"></h1>
  <p bind="product.description"></p>
</div>
```

---

## Notes and edge cases

### Multiple directives competing for the same element

If two `<div hidden page-description>` elements exist on the same page, both
write to the same `<meta name="description">` tag — the last one processed
wins. Keep one directive per head element per page.

### Cleanup on unmount

The `page-description`, `page-canonical`, and `page-jsonld` directives
register disposal hooks that **remove** the `<head>` elements they created
when the host `<div hidden>` is removed from the DOM (e.g. via an `if=`
directive or SPA route change). This prevents stale metadata from persisting
across route transitions. Only elements created by the directive are removed
— hand-written elements already present in `<head>` are left untouched.

`page-title` is the exception: it sets `document.title` directly and does
**not** reset the title on disposal, since the browser always requires a
title value. The last value persists until another directive or route
overwrites it.

### `page-jsonld` template capture

The `page-jsonld` watcher captures the element's `textContent` as a static
template string once at directive init time. `{placeholder}` expressions
inside the JSON are re-evaluated on every reactive update, but structural
changes to the element's children after init are not picked up.

---

## See Also

- [Routing → Route Head Attributes](routing.md#route-head-attributes) — head management for SPA routes
- [Configuration](configuration.md) — global settings

---

**Previous:** [Drag & Drop ←](drag-and-drop.md) | **Next:** [Custom Directives →](custom-directives.md)
