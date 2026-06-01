import { processTree } from '../src/registry.js';
import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/validation.js';

describe('Error templates — multiple fields', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  function buildLoginForm() {
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.setAttribute('validate-on', 'blur');
    form.innerHTML = `
      <div class="group">
        <input name="email" type="email" required
          error-required="Campo obrigatório" error="#emailError" error-class="input-error" />
        <template id="emailError">
          <p class="email-err" animate="fadeIn" animate-duration="300">
            <span class="email-err-text" bind="$error"></span>
          </p>
        </template>
      </div>
      <div>
        <input name="password" type="password" required
          error-required="Campo obrigatório" error="#passwordError" error-class="input-error" />
        <template id="passwordError">
          <p class="pass-err">
            <span class="pass-err-text" bind="$error"></span>
          </p>
        </template>
      </div>
    `;
    document.body.appendChild(form);
    processTree(form);
    return form;
  }

  test('each field shows its own error template on blur', async () => {
    const form = buildLoginForm();
    await new Promise(r => setTimeout(r, 50));

    const email = form.querySelector('input[name="email"]');
    const password = form.querySelector('input[name="password"]');

    email.dispatchEvent(new Event('focusout', { bubbles: true }));
    expect(form.querySelector('.email-err-text')?.textContent).toBe('Campo obrigatório');
    expect(form.querySelector('.pass-err-text')).toBeNull();

    password.dispatchEvent(new Event('focusout', { bubbles: true }));
    expect(form.querySelector('.pass-err-text')?.textContent).toBe('Campo obrigatório');
    expect(form.querySelector('.email-err-text')?.textContent).toBe('Campo obrigatório');
  });

  test('blurring password does not re-animate unchanged email error', async () => {
    const form = buildLoginForm();
    await new Promise(r => setTimeout(r, 50));

    const email = form.querySelector('input[name="email"]');
    const password = form.querySelector('input[name="password"]');

    email.dispatchEvent(new Event('focusout', { bubbles: true }));
    const emailErr = form.querySelector('.email-err');
    expect(emailErr.classList.contains('fadeIn')).toBe(true);

    // Simulate animation finished
    emailErr.classList.remove('fadeIn');
    emailErr.style.animationName = '';

    password.dispatchEvent(new Event('focusout', { bubbles: true }));

    const emailErrAfter = form.querySelector('.email-err');
    expect(emailErrAfter.classList.contains('fadeIn')).toBe(false);
    expect(form.querySelector('.pass-err-text')?.textContent).toBe('Campo obrigatório');
  });
});
