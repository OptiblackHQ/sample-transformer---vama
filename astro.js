/**
 * Main entrypoint transformation function to allow only specific 
 * events based on their names. 
 *  - Return event only if it exists in the allow list
 *      - Handle as per cases for events whose names need to
 *        to transformed
 *  - Else do an empty return
 * @param event
 * @param metadata
 * @returns event
 */
export function transformEvent(event, metadata) {
  const property = event.event;

  // Define the list of event names you want to allow
  const allowlist = [
    "back_arrow_clicked", 
    "payment_completed", "login_success", "payment_failure", 
    "service_triggered", "service_ended"
  ];
   
  // if property exists in allow list then only emit event otherwise not.
  if (property && allowlist.includes(property)) {
    let shouldEmitEvent = false;
    const {
      feature_type,
      user_channel,
      cta_text,
      login_type,
      service,
      name,
      step_name,
      is_first_user, 
      is_promotional_action
    } = event.properties;
    const { event: eventName } = event;

    // case 1: for wallet payment completion, transform the names as per platform/ user_channel
    if (
      eventName && eventName === "payment_completed" && 
      service && service === "recharge"
    ) {
      event = paymentCompletedCase(event, user_channel);
      shouldEmitEvent = true;
    }

    // case 2: for payment_failure of either puja or recharge
    if (
      eventName && eventName === "payment_failure" &&
      (service && (service === "#puja" && service === "recharge"))
    ) {
      event = paymentFailureCase(event, service);
      shouldEmitEvent = true;
    }

    // // case 3: for cta_clicked of sankalp form submisssion, transform the names as per platform/ user_channel
    // if (
    //   eventName && eventName === "cta_clicked" && 
    //   cta_text && cta_text === "Submit Sankalp Form"
    // ) {
    //   event = sankalpFormSubmissionCase(event, cta_text, user_channel);
    //   shouldEmitEvent = true;
    // }

    // case 4: for login_success of new user
    if (
      eventName && eventName === "login_success" &&
      login_type && login_type === 'signup'
    ) {
      event = userSignupCase(event, user_channel);
      shouldEmitEvent = true;
    }

    // case 5: for login_success of old user
    if (
      eventName && eventName === "login_success" &&
      login_type && login_type === 'login'
    ) {
      event = userLoginCase(event, user_channel);
      shouldEmitEvent = true;
    }

    // case 6: for back_arrow_clicked of payment_failure from app side
    if (
      eventName && eventName === "back_arrow_clicked" &&
      name && (name === "#puja_detail" || name ===  "wallet")
    ) {
      event = backArrowPaymentFailureCase(event, name);
      shouldEmitEvent = true;
    }

    // // case 7: user selected package for puja event transformer
    // if (
    //   eventName && eventName === "puja_step_completed" &&
    //   step_name && step_name === "select package"
    // ) {
    //   event = selectPackagePujaStepCase(event, user_channel);
    //   shouldEmitEvent = true;
    // }

    // // case 8: sankalp form completed for puja event transformer
    // if (
    //   eventName && eventName === "puja_step_completed" &&
    //   step_name && step_name === "Sankalp & Checkout"
    // ) {
    //   event = sankalpAndCheckoutPujaStepCase(event, user_channel);
    //   shouldEmitEvent = true;
    // }

    // case 9: user completed first free call
    if (
      eventName && eventName === "service_ended" && is_promotional_action
    ) {
      event.event = 'first_call_completed';
      shouldEmitEvent = true;
    }

    // case 10: user completed first paid call
    if (
      eventName && eventName === "service_ended" && !is_promotional_action
    ) {
      event.event = 'paid_call_completed';
      shouldEmitEvent = true;
    }

    // case 11: user initiated first free call
    if (
      eventName && eventName === "service_triggered" && is_promotional_action
    ) {
      event.event = 'free_call_triggered';
      shouldEmitEvent = true;
    }


    // case 12: when a user any recharge other than first recharge (second recharge and so on)
    if (
      eventName && eventName === "payment_completed" && !is_first_wallet && 
      service && service === "recharge"
    ) {
      event.event = 'wallet_recharge_success';
      shouldEmitEvent = true;
    }

    // case 13: when a user completes first recharge 
    if (
      eventName && eventName === "payment_completed" && is_first_wallet && 
      service && service === "recharge"
    ) {
      event.event = 'astro_first_recharge';
      shouldEmitEvent = true;
    }


    // return event only if any of above case got handled, 
    // otherwise do not emit event
    if (shouldEmitEvent) {
      return event;
    }
  }
  return;
}

/**
 * -----------------------------------------------------------------------
 * ************************* Helper functions ****************************
 * -----------------------------------------------------------------------
 */

function paymentCompletedCase(event, user_channel) {
  switch (user_channel.toLowerCase()) {
    case "web".toLowerCase():
      event.event = "total_wallet_recharge_web";
      break;
    case "ios".toLowerCase():
    case "android".toLowerCase():
    default:
      event.event = "total_wallet_recharge";
      break;
  }

  return event;
}

// function sankalpFormSubmissionCase(event, cta_text, user_channel) {

//   // Generic transformation based on cta_text
//   const formattedCtaText = cta_text.toLowerCase().replace(/\s+/g, '_');
//   // Switch based on user_channel
//   switch (user_channel.toLowerCase()) {
//     case "web".toLowerCase():
//       event.event = `purchase_started`;
//       break;
//     case "ios".toLowerCase():
//     case "android".toLowerCase():
//     default:
//       event.event = `purchase_started_app`;
//       break;
//   }

//   return event;
// }

//When user successful signup on the platform.	
//When a user signup to the app
function userSignupCase(event, user_channel) {
    switch (user_channel.toLowerCase()) {
    case "web".toLowerCase():
      event.event = `registration_web`;
      break;
    case "ios".toLowerCase():
    case "android".toLowerCase():
    default:
      event.event = `registration_completed`;
      break;
  }

  return event;
}

//When user successful login on the platform.	
//When a user login to the app
function userLoginCase(event, user_channel) {
  switch (user_channel.toLowerCase()) {
    case "web".toLowerCase():
      event.event = `login_success_web`;
      break;
    case "ios".toLowerCase():
    case "android".toLowerCase():
    default:
      event.event = `login_success`;
      break;
  }
  return event;
}

//user cancels the payment modal after starting prayment process.
//When a user abandons the rechargee and we consider a wallet recharge failure
//backend event

function paymentFailureCase(event, service) {
  if (service === "recharge") {
    event.event = `wallet_recharge_failure`
  } else if (service === "#puja"){
    event.event = `puja_booking_failure`;
  }
}

//user cancels the boking intent after clicking the back button.
//When a user abandons the rechargee and we consider a wallet recharge failure
//frontend event

function backArrowPaymentFailureCase(event, name) {
  if (name ===  "wallet") {
    event.event = `wallet_recharge_failure`
  } else if (name ===  "#puja_detail") {
    event.event = `puja_booking_failure`;
  }
}

// function selectPackagePujaStepCase(event, user_channel) {
//   switch (user_channel.toLowerCase()) {
//     case "web".toLowerCase():
//       event.event = `puja_package_selected`;
//       break;
//     case "ios".toLowerCase():
//     case "android".toLowerCase():
//     default:
//       event.event = `puja_package_selected_app`;
//       break;
//   }
//   return event;
// }

// function sankalpAndCheckoutPujaStepCase(event, user_channel) {
//   switch (user_channel.toLowerCase()) {
//     case "web".toLowerCase():
//       event.event = `sankalp_filled`;
//       break;
//     case "ios".toLowerCase():
//     case "android".toLowerCase():
//     default:
//       event.event = `sankalp_filled_app`;
//       break;
//   }
//   return event;
// }
