const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const configTemplatePath = path.join(__dirname, '../templates/config_form.ejs');
const summaryTemplatePath = path.join(__dirname, '../templates/summary.ejs');

console.log('Verifying Config Form Template...');
try {
    const template = fs.readFileSync(configTemplatePath, 'utf-8');
    const dummyData = {
        url: 'https://example.com',
        requestor_category: 'Media',
        delivery_method: 'Electronic Copy',
        given_name: 'John',
        family_name: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        address_2: '',
        city: 'Metropolis',
        postal_code: '12345',
        state_province: 'ON',
        country: 'Canada',
        preferred_language: 'English',
        consent: 'Yes',
        additional_comments: 'None'
    };
    const html = ejs.render(template, { data: dummyData, message: 'Test Message' });
    if (html.includes('value="John"')) console.log('PASS: Config Form rendered correctly.');
    else console.error('FAIL: Config Form did not render data correctly.');
} catch (e) {
    console.error('FAIL: Config Form Error:', e.message);
}

console.log('\nVerifying Summary Template...');
try {
    const template = fs.readFileSync(summaryTemplatePath, 'utf-8');
    const dummyResults = [
        { url: 'https://test.com/1', timestamp: new Date(), status: 'SUBMITTED' },
        { url: 'https://test.com/2', timestamp: new Date(), status: 'ERROR' }
    ];
    const html = ejs.render(template, { results: dummyResults });
    if (html.includes('https://test.com/1') && html.includes('error')) console.log('PASS: Summary Page rendered correctly.');
    else console.error('FAIL: Summary Page did not render data correctly.');
} catch (e) {
    console.error('FAIL: Summary Page Error:', e.message);
}
