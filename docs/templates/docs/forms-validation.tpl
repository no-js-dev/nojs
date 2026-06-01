<!-- Forms & Validation — from forms-validation.md -->

<section class="hero-section">
  <span class="badge" t="docs.formsValidation.hero.badge"></span>
  <h1 class="hero-title" t="docs.formsValidation.hero.title"></h1>
  <p class="hero-subtitle" t="docs.formsValidation.hero.subtitle"></p>
</section>

<div class="doc-content">

  <!-- Deprecation Banner (validate directive only) -->
  <div class="nojs-deprecation-banner" style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <strong style="color: #92400E; font-size: 15px;">&#x26A0;&#xFE0F; Validation moved to NoJS Elements</strong>
    <p style="color: #78350F; margin: 8px 0 0; font-size: 14px; line-height: 1.6;">The <code>validate</code> directive and related validation attributes (<code>validate-on</code>, <code>validate-if</code>, <code>error-*</code>, <code>$form</code> context) have moved to <code>@erickxavier/nojs-elements</code> as of v1.13.0. They are still available in core as deprecation stubs that emit warnings. Install the Elements plugin for full functionality. The <code>error-boundary</code> directive remains in core.</p>
    <p style="margin: 8px 0 0;"><a href="#/docs/plugins" style="color: #92400E; font-weight: 600; text-decoration: underline;">Migration Guide &rarr;</a></p>
  </div>

  <!-- Declarative Form Submission -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-submission" t="docs.formsValidation.submission.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">post</span>=<span class="hl-str">"/api/register"</span>
      <span class="hl-attr">success</span>=<span class="hl-str">"#registerSuccess"</span>
      <span class="hl-attr">error</span>=<span class="hl-str">"#registerError"</span>
      <span class="hl-attr">loading</span>=<span class="hl-str">"#registerLoading"</span>
      <span class="hl-attr">validate</span><span class="hl-tag">&gt;</span>

  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"text"</span>     <span class="hl-attr">name</span>=<span class="hl-str">"name"</span>     <span class="hl-attr">required</span> <span class="hl-attr">minlength</span>=<span class="hl-str">"2"</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"email"</span>    <span class="hl-attr">name</span>=<span class="hl-str">"email"</span>    <span class="hl-attr">required</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"password"</span> <span class="hl-attr">name</span>=<span class="hl-str">"password"</span> <span class="hl-attr">required</span> <span class="hl-attr">minlength</span>=<span class="hl-str">"8"</span>
         <span class="hl-attr">pattern</span>=<span class="hl-str">"(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"</span> <span class="hl-tag">/&gt;</span>

  <span class="hl-tag">&lt;button</span> <span class="hl-attr">type</span>=<span class="hl-str">"submit"</span><span class="hl-tag">&gt;</span>Register<span class="hl-tag">&lt;/button&gt;</span>  <span class="hl-cmt">&lt;!-- auto-disabled when invalid --&gt;</span>

<span class="hl-tag">&lt;/form&gt;</span></pre></div>
  </div>

  <!-- Validation Rules -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-rules" t="docs.formsValidation.rules.title"></h2>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- All native HTML5 validation works automatically --&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">required</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">minlength</span>=<span class="hl-str">"3"</span> <span class="hl-attr">maxlength</span>=<span class="hl-str">"50"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"email"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"url"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"number"</span> <span class="hl-attr">min</span>=<span class="hl-str">"1"</span> <span class="hl-attr">max</span>=<span class="hl-str">"100"</span> <span class="hl-attr">step</span>=<span class="hl-str">"5"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">pattern</span>=<span class="hl-str">"[0-9]{3}-[0-9]{4}"</span> <span class="hl-tag">/&gt;</span>

<span class="hl-cmt">&lt;!-- No.JS-specific validators (beyond HTML5) --&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">validate</span>=<span class="hl-str">"custom:validateUsername"</span> <span class="hl-tag">/&gt;</span>  <span class="hl-cmt">&lt;!-- Custom function --&gt;</span></pre></div>
  </div>

  <!-- Per-Rule Error Messages -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-per-rule-errors" t="docs.formsValidation.perRuleErrors.title"></h2>
    <p class="doc-text" t="docs.formsValidation.perRuleErrors.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"email"</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-attr">required</span>
       <span class="hl-attr">error-required</span>=<span class="hl-str">"Email is required"</span>
       <span class="hl-attr">error-email</span>=<span class="hl-str">"Please enter a valid email"</span>
       <span class="hl-attr">error</span>=<span class="hl-str">"This field is invalid"</span> <span class="hl-tag">/&gt;</span></pre></div>
  </div>

  <!-- Error Templates -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-error-templates" t="docs.formsValidation.errorTemplates.title"></h2>
    <p class="doc-text" t="docs.formsValidation.errorTemplates.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"email"</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-attr">required</span>
       <span class="hl-attr">error</span>=<span class="hl-str">"#emailError"</span> <span class="hl-tag">/&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"emailError"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">class</span>=<span class="hl-str">"field-error"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$error"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <!-- Error CSS Class -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-error-class" t="docs.formsValidation.errorClass.title"></h2>
    <p class="doc-text" t="docs.formsValidation.errorClass.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">validate</span> <span class="hl-attr">error-class</span>=<span class="hl-str">"is-invalid"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-attr">required</span> <span class="hl-tag">/&gt;</span>  <span class="hl-cmt">&lt;!-- gets .is-invalid when invalid + touched --&gt;</span>
<span class="hl-tag">&lt;/form&gt;</span></pre></div>
  </div>

  <!-- $form Context -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-form-context" t="docs.formsValidation.formContext.title"></h2>
    <p class="doc-text" t="docs.formsValidation.formContext.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.formsValidation.formContext.col1"></th><th t="docs.formsValidation.formContext.col2"></th><th t="docs.formsValidation.formContext.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>$form.valid</code></td><td>boolean</td><td t="docs.formsValidation.formContext.valid"></td></tr>
        <tr><td><code>$form.dirty</code></td><td>boolean</td><td t="docs.formsValidation.formContext.dirty"></td></tr>
        <tr><td><code>$form.touched</code></td><td>boolean</td><td t="docs.formsValidation.formContext.touched"></td></tr>
        <tr><td><code>$form.submitting</code></td><td>boolean</td><td t="docs.formsValidation.formContext.submitting"></td></tr>
        <tr><td><code>$form.pending</code></td><td>boolean</td><td t="docs.formsValidation.formContext.pending"></td></tr>
        <tr><td><code>$form.errors</code></td><td>object</td><td t="docs.formsValidation.formContext.errors"></td></tr>
        <tr><td><code>$form.values</code></td><td>object</td><td t="docs.formsValidation.formContext.values"></td></tr>
        <tr><td><code>$form.firstError</code></td><td>string|null</td><td t="docs.formsValidation.formContext.firstError"></td></tr>
        <tr><td><code>$form.errorCount</code></td><td>number</td><td t="docs.formsValidation.formContext.errorCount"></td></tr>
        <tr><td><code>$form.fields</code></td><td>object</td><td t="docs.formsValidation.formContext.fields"></td></tr>
        <tr><td><code>$form.reset()</code></td><td>function</td><td t="docs.formsValidation.formContext.reset"></td></tr>
      </tbody>
    </table>

    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">post</span>=<span class="hl-str">"/api/contact"</span> <span class="hl-attr">validate</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"text"</span> <span class="hl-attr">name</span>=<span class="hl-str">"name"</span> <span class="hl-attr">required</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"email"</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-attr">required</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;textarea</span> <span class="hl-attr">name</span>=<span class="hl-str">"message"</span> <span class="hl-attr">required</span> <span class="hl-attr">minlength</span>=<span class="hl-str">"10"</span><span class="hl-tag">&gt;&lt;/textarea&gt;</span>

  <span class="hl-tag">&lt;p</span> <span class="hl-attr">show</span>=<span class="hl-str">"$form.errors.email"</span> <span class="hl-attr">class</span>=<span class="hl-str">"error"</span>
     <span class="hl-attr">bind</span>=<span class="hl-str">"$form.errors.email"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>

  <span class="hl-cmt">&lt;!-- Show first error as a summary --&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">show</span>=<span class="hl-str">"$form.firstError"</span> <span class="hl-attr">class</span>=<span class="hl-str">"error-summary"</span>
     <span class="hl-attr">bind</span>=<span class="hl-str">"$form.firstError"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>

  <span class="hl-tag">&lt;button</span> <span class="hl-attr">type</span>=<span class="hl-str">"submit"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">hide</span>=<span class="hl-str">"$form.submitting"</span><span class="hl-tag">&gt;</span>Send<span class="hl-tag">&lt;/span&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">show</span>=<span class="hl-str">"$form.submitting"</span><span class="hl-tag">&gt;</span>Sending...<span class="hl-tag">&lt;/span&gt;</span>
  <span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/form&gt;</span></pre></div>
  </div>

  <!-- $form.fields — Per-Field State -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-form-fields" t="docs.formsValidation.formFields.title"></h2>
    <p class="doc-text" t="docs.formsValidation.formFields.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">validate</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"email"</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-attr">required</span> <span class="hl-tag">/&gt;</span>

  <span class="hl-tag">&lt;p</span> <span class="hl-attr">show</span>=<span class="hl-str">"$form.fields.email.touched &amp;&amp; !$form.fields.email.valid"</span>
     <span class="hl-attr">bind</span>=<span class="hl-str">"$form.fields.email.error"</span>
     <span class="hl-attr">class</span>=<span class="hl-str">"error"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/form&gt;</span></pre></div>

    <h3 class="doc-subtitle" id="forms-form-fields-as" t="docs.formsValidation.formFields.asTitle"></h3>
    <p class="doc-text" t="docs.formsValidation.formFields.asText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">validate</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"email"</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-attr">required</span> <span class="hl-attr">as</span>=<span class="hl-str">"emailField"</span> <span class="hl-tag">/&gt;</span>

  <span class="hl-tag">&lt;p</span> <span class="hl-attr">show</span>=<span class="hl-str">"!emailField.valid &amp;&amp; emailField.touched"</span>
     <span class="hl-attr">bind</span>=<span class="hl-str">"emailField.error"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/form&gt;</span></pre></div>
  </div>

  <!-- Validation Triggers -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-validate-on" t="docs.formsValidation.validateOn.title"></h2>
    <p class="doc-text" t="docs.formsValidation.validateOn.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">validate</span> <span class="hl-attr">validate-on</span>=<span class="hl-str">"blur"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-attr">required</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;/form&gt;</span></pre></div>
    <p class="doc-note" t="docs.formsValidation.validateOn.note"></p>
  </div>

  <!-- Conditional Validation -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-validate-if" t="docs.formsValidation.validateIf.title"></h2>
    <p class="doc-text" t="docs.formsValidation.validateIf.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">validate</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"checkbox"</span> <span class="hl-attr">on:change</span>=<span class="hl-str">"hasCompany = $event.target.checked"</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;label&gt;</span>I have a company<span class="hl-tag">&lt;/label&gt;</span>

  <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"company"</span> <span class="hl-attr">required</span>
         <span class="hl-attr">validate-if</span>=<span class="hl-str">"hasCompany"</span>
         <span class="hl-attr">placeholder</span>=<span class="hl-str">"Company name"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;/form&gt;</span></pre></div>
  </div>

  <!-- Auto-Disable Submit -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-auto-disable" t="docs.formsValidation.autoDisable.title"></h2>
    <p class="doc-text" t="docs.formsValidation.autoDisable.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">validate</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-attr">required</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">type</span>=<span class="hl-str">"submit"</span><span class="hl-tag">&gt;</span>Send<span class="hl-tag">&lt;/button&gt;</span>  <span class="hl-cmt">&lt;!-- auto-disabled when invalid --&gt;</span>
<span class="hl-tag">&lt;/form&gt;</span></pre></div>
  </div>

  <!-- Custom Validators -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-custom-validators" t="docs.formsValidation.customValidators.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">validator</span>(<span class="hl-str">'strongPassword'</span>, (<span class="hl-attr">value</span>) <span class="hl-op">=&gt;</span> {
    <span class="hl-kw">if</span> (value.length <span class="hl-op">&lt;</span> <span class="hl-num">8</span>) <span class="hl-kw">return</span> <span class="hl-str">'Must be at least 8 characters'</span>;
    <span class="hl-kw">if</span> (<span class="hl-op">!</span>/[A-Z]/.<span class="hl-fn">test</span>(value)) <span class="hl-kw">return</span> <span class="hl-str">'Must contain uppercase'</span>;
    <span class="hl-kw">if</span> (<span class="hl-op">!</span>/[0-9]/.<span class="hl-fn">test</span>(value)) <span class="hl-kw">return</span> <span class="hl-str">'Must contain a number'</span>;
    <span class="hl-kw">return</span> <span class="hl-kw">true</span>;
  });
<span class="hl-tag">&lt;/script&gt;</span>

<span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"password"</span> <span class="hl-attr">validate</span>=<span class="hl-str">"strongPassword"</span> <span class="hl-tag">/&gt;</span></pre></div>
  </div>

  <!-- Live Demo -->
  <div class="doc-section">
    <h2 class="doc-title" id="forms-live-demo" t="docs.formsValidation.liveDemo.title"></h2>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">validate</span> <span class="hl-attr">validate-on</span>=<span class="hl-str">"focusout"</span>
      <span class="hl-attr">error-class</span>=<span class="hl-str">"field-invalid"</span>
      <span class="hl-attr">action</span>=<span class="hl-str">"/register"</span><span class="hl-tag">&gt;</span>

  <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"username"</span> <span class="hl-attr">required</span>
         <span class="hl-attr">minlength</span>=<span class="hl-str">"3"</span> <span class="hl-attr">maxlength</span>=<span class="hl-str">"20"</span>
         <span class="hl-attr">error-required</span>=<span class="hl-str">"Username is required"</span>
         <span class="hl-attr">error-tooShort</span>=<span class="hl-str">"At least 3 characters"</span> <span class="hl-tag">/&gt;</span>

  <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-attr">type</span>=<span class="hl-str">"email"</span> <span class="hl-attr">required</span>
         <span class="hl-attr">error</span>=<span class="hl-str">"Enter a valid email"</span> <span class="hl-tag">/&gt;</span>

  <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"age"</span> <span class="hl-attr">type</span>=<span class="hl-str">"number"</span>
         <span class="hl-attr">min</span>=<span class="hl-str">"13"</span> <span class="hl-attr">max</span>=<span class="hl-str">"120"</span>
         <span class="hl-attr">error-rangeUnderflow</span>=<span class="hl-str">"Must be 13+"</span> <span class="hl-tag">/&gt;</span>

  <span class="hl-tag">&lt;select</span> <span class="hl-attr">name</span>=<span class="hl-str">"role"</span> <span class="hl-attr">required</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;option</span> <span class="hl-attr">value</span>=<span class="hl-str">""</span><span class="hl-tag">&gt;</span>Select a role<span class="hl-tag">&lt;/option&gt;</span>
    <span class="hl-tag">&lt;option&gt;</span>Developer<span class="hl-tag">&lt;/option&gt;</span>
    <span class="hl-tag">&lt;option&gt;</span>Designer<span class="hl-tag">&lt;/option&gt;</span>
  <span class="hl-tag">&lt;/select&gt;</span>

  <span class="hl-tag">&lt;label&gt;</span>
    <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"terms"</span> <span class="hl-attr">type</span>=<span class="hl-str">"checkbox"</span> <span class="hl-attr">required</span> <span class="hl-tag">/&gt;</span>
    I agree to the terms
  <span class="hl-tag">&lt;/label&gt;</span>

  <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$form.firstError"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">type</span>=<span class="hl-str">"submit"</span><span class="hl-tag">&gt;</span>Register<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/form&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.formsValidation.liveDemo.label"></span>
        <style>
          .reg-demo .field-invalid { border-color: var(--error) !important; }
          .reg-demo .fe { font-size: 12px; color: var(--error); margin-top: 4px; }
          .reg-demo .status-bar { display: flex; gap: 16px; font-size: 13px; margin-top: 12px; padding: 8px 12px; border-radius: var(--radius-sm); background: var(--bg-alt); }
          .reg-demo .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
          .reg-demo .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
          .reg-demo .checkbox-label input { width: 16px; height: 16px; }
          .reg-demo .success-msg { margin-top: 12px; padding: 12px; border-radius: var(--radius-sm); background: color-mix(in srgb, var(--success) 10%, transparent); color: var(--success); font-weight: 500; }
        </style>
        <div class="reg-demo" state="{ registered: false }">
          <form validate validate-on="focusout" error-class="field-invalid" on:submit="registered = true">
            <div class="form-group">
              <label class="form-label" t="docs.formsValidation.liveDemo.usernameLabel"></label>
              <input class="input" name="username" required minlength="3" maxlength="20"
                     error-required="Username is required" error-tooShort="At least 3 characters"
                     t-placeholder="docs.formsValidation.liveDemo.usernamePlaceholder" />
              <span class="fe" bind="$form.errors.username"></span>
            </div>
            <div class="form-group">
              <label class="form-label" t="docs.formsValidation.liveDemo.emailLabel"></label>
              <input class="input" name="email" type="email" required error="Enter a valid email"
                     t-placeholder="docs.formsValidation.liveDemo.emailPlaceholder" />
              <span class="fe" bind="$form.errors.email"></span>
            </div>
            <div class="form-group">
              <label class="form-label" t="docs.formsValidation.liveDemo.ageLabel"></label>
              <input class="input" name="age" type="number" min="13" max="120"
                     error-rangeUnderflow="Must be 13+"
                     t-placeholder="docs.formsValidation.liveDemo.agePlaceholder" />
              <span class="fe" bind="$form.errors.age"></span>
            </div>
            <div class="form-group">
              <label class="form-label" t="docs.formsValidation.liveDemo.roleLabel"></label>
              <select class="select" name="role" required>
                <option value="" t="docs.formsValidation.liveDemo.roleDefault"></option>
                <option value="developer" t="docs.formsValidation.liveDemo.roleDev"></option>
                <option value="designer" t="docs.formsValidation.liveDemo.roleDesign"></option>
                <option value="manager" t="docs.formsValidation.liveDemo.roleMgr"></option>
              </select>
              <span class="fe" bind="$form.errors.role"></span>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input name="terms" type="checkbox" required />
                <span t="docs.formsValidation.liveDemo.termsLabel"></span>
              </label>
            </div>
            <div class="status-bar">
              <span><span class="status-dot" style-background="$form.valid ? 'var(--success)' : 'var(--error)'"></span> <span bind="$form.valid ? 'Valid' : $form.errorCount + ' error(s)'"></span></span>
              <span><span class="status-dot" style-background="$form.dirty ? 'var(--primary)' : 'var(--border)'"></span> <span bind="$form.dirty ? 'Dirty' : 'Pristine'"></span></span>
            </div>
            <div style="margin-top: 12px;">
              <button class="btn btn-primary btn-sm" type="submit" t="docs.formsValidation.liveDemo.registerButton"></button>
            </div>
            <div class="success-msg" show="registered">
              <span t="docs.formsValidation.liveDemo.successMessage"></span>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

</div>
