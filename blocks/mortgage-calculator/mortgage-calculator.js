import { getMetadata } from '../../scripts/aem.js';

function formatCurrency(value) {
  return new Intl.NumberFormat(getMetadata('locale') || undefined, {
    style: 'currency',
    currency: getMetadata('currency') || 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

// Canadian mortgages compound semi-annually
function calculatePayment(principal, annualRate, months) {
  const monthlyRate = (1 + annualRate / 2) ** (2 / 12) - 1;
  return principal * monthlyRate / (1 - (1 + monthlyRate) ** -months);
}

/** Optional rows after the first: two cells, key | value (label, button, result, rate, years, amount). */
function readConfig(rows) {
  return Object.fromEntries(rows
    .filter((r) => r.children.length === 2)
    .map((r) => [r.children[0].textContent.trim().toLowerCase(), r.children[1].textContent.trim()]));
}

export default function decorate(block) {
  const [row, ...configRows] = [...block.children];
  const config = readConfig(configRows);
  const cells = row ? [...row.children] : [];
  const ratesPanel = document.createElement('div');
  ratesPanel.className = 'mortgage-rates-panel';
  const calculatorPanel = document.createElement('div');
  calculatorPanel.className = 'mortgage-calculator-panel';
  if (cells[0]) while (cells[0].firstChild) ratesPanel.append(cells[0].firstChild);
  if (cells[1]) while (cells[1].firstChild) calculatorPanel.append(cells[1].firstChild);

  // rate: authored, else the first rate in the rates table
  const firstRate = ratesPanel.querySelector('tbody tr td:nth-child(2)')?.textContent.match(/[\d.]+(?=\s*%)/)?.[0];
  const annualRate = parseFloat(config.rate || firstRate || '5') / 100;
  const months = (parseInt(config.years, 10) || 25) * 12;

  const form = document.createElement('form');
  form.className = 'mortgage-calculator-form';

  const label = document.createElement('label');
  label.htmlFor = 'mortgage-amount';
  label.textContent = config.label || 'Mortgage Amount:';

  const input = document.createElement('input');
  input.id = 'mortgage-amount';
  input.name = 'mortgage-amount';
  input.type = 'number';
  input.inputMode = 'decimal';
  input.min = '1000';
  input.max = '10000000';
  input.step = '1000';
  input.value = config.amount || '400000';
  input.required = true;

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button';
  submit.textContent = config.button || 'Calculate';

  const output = document.createElement('p');
  output.className = 'mortgage-calculator-result';
  output.setAttribute('role', 'status');
  output.setAttribute('aria-live', 'polite');

  form.append(label, input, submit, output);
  calculatorPanel.append(form);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!input.reportValidity()) return;
    const payment = formatCurrency(calculatePayment(Number(input.value), annualRate, months));
    output.textContent = `${config.result || 'Estimated monthly payment:'} ${payment}`;
  });

  const layout = document.createElement('div');
  layout.className = 'mortgage-calculator-layout';
  layout.append(ratesPanel, calculatorPanel);
  block.replaceChildren(layout);
}
