import {transformCustomLabels} from '../src/transforms/labels';
describe('test suite', () => {
  it('will have some tests in the future', () => {
    const xml = transformCustomLabels(
      // NEW
      `<?xml version="1.0" encoding="UTF-8"?>
      <CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata">
          <labels>
              <fullName>Activation_Form_Action</fullName>
              <categories>RSQ</categories>
              <language>en_US</language>
              <protected>false</protected>
              <shortDescription>Activation Form Action</shortDescription>
              <value>ActivationForm_w_Discount</value>
          </labels>
          <labels>
              <fullName>FOO</fullName>
              <categories>RSQ</categories>
              <language>en_US</language>
              <protected>false</protected>
              <shortDescription>Activation Form Action</shortDescription>
              <value>ActivationForm_w_Discountfooo</value>
          </labels>
      </CustomLabels>`,
      // OLD
      `<?xml version="1.0" encoding="UTF-8"?>
      <CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata">
          <labels>
              <fullName>Activation_Form_Action</fullName>
              <categories>RSQ</categories>
              <language>en_US</language>
              <protected>false</protected>
              <shortDescription>Activation Form Action</shortDescription>
              <value>ActivationForm_w_Discount</value>
          </labels>
          <labels>
              <fullName>FOO</fullName>
              <categories>RSQ</categories>
              <language>en_US</language>
              <protected>false</protected>
              <shortDescription>Activation Form Action</shortDescription>
              <value>ActivationForm_w_Discount</value>
          </labels>
      </CustomLabels>`
    );
    console.log(xml);
  });
});
