import React from 'react';
import '../Form/Form.scss';
import AuthInput from '../Form/AuthInput/AuthInput';

const StepTwo = () => {
  const basicInformationSignup = (
    <>
      <h3>Basic Information</h3>

      <AuthInput value="" placeholder="Title" type="text" icon="username" />
      <AuthInput value="" placeholder="Sex" type="text" icon="username" />
      {/* Relevant input for Doctor form? */}
      <AuthInput value="" placeholder="Weight" type="number" icon="clipboard" />
      {/* Date of Birth input - needs formatting for Date Picker input */}
      <AuthInput value="" placeholder="Date of Birth" type="date" />
      <AuthInput
        value=""
        placeholder="Phone number"
        type="tel"
        pattern="[0-9]{10}"
        icon="phone"
      />

      <h3>Address</h3>
      <AuthInput value="" placeholder="Street No." type="number" icon="hash" />
      <AuthInput value="" placeholder="Street" type="text" icon="mapPin" />
      <AuthInput value="" placeholder="City" type="text" icon="home" />
      <AuthInput value="" placeholder="Country" type="text" icon="navArrow" />
      <AuthInput value="" placeholder="Postcode" type="number" icon="hash" />
    </>
  );

  return <div className="form-wrapper ">{basicInformationSignup}</div>;
};

export default StepTwo;
