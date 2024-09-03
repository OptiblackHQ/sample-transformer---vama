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
    "cta_clicked", "back_arrow_clicked", "puja_step_completed", 
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

    // case 1: for puja payment completion, transform the names as per platform/ user_channel
    if (
      eventName && eventName === "payment_completed" && 
      feature_type && feature_type === "puja"
    ) {
      event = paymentCompletedCase(event, user_channel);
      shouldEmitEvent = true;
    }

    // case 2: for payment_failure of either puja or recharge
    if (
      eventName && eventName === "payment_failure" &&
      (service && (service === "puja" && service === "recharge"))
    ) {
      event = paymentFailureCase(event, service);
      shouldEmitEvent = true;
    }

    // case 3: for cta_clicked of sankalp form submisssion, transform the names as per platform/ user_channel
    if (
      eventName && eventName === "cta_clicked" && 
      cta_text && cta_text === "Submit Sankalp Form"
    ) {
      event = sankalpFormSubmissionCase(event, cta_text, user_channel);
      shouldEmitEvent = true;
    }

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
      name && (name === "puja_detail" || name ===  "wallet")
    ) {
      event = backArrowPaymentFailureCase(event, name);
      shouldEmitEvent = true;
    }

    // case 7: user selected package for puja event transformer
    if (
      eventName && eventName === "puja_step_completed" &&
      step_name && step_name === "select package"
    ) {
      event = selectPackagePujaStepCase(event, user_channel);
      shouldEmitEvent = true;
    }

    // case 8: sankalp form completed for puja event transformer
    if (
      eventName && eventName === "puja_step_completed" &&
      step_name && step_name === "Sankalp & Checkout"
    ) {
      event = sankalpAndCheckoutPujaStepCase(event, user_channel);
      shouldEmitEvent = true;
    }

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
      event.event = "purchase_completed";
      break;
    case "ios".toLowerCase():
    case "android".toLowerCase():
    default:
      event.event = "puja_booking_app";
      break;
  }

  return event;
}

function sankalpFormSubmissionCase(event, cta_text, user_channel) {

  // Generic transformation based on cta_text
  const formattedCtaText = cta_text.toLowerCase().replace(/\s+/g, '_');
  // Switch based on user_channel
  switch (user_channel.toLowerCase()) {
    case "web".toLowerCase():
      event.event = `purchase_started`;
      break;
    case "ios".toLowerCase():
    case "android".toLowerCase():
    default:
      event.event = `purchase_started_app`;
      break;
  }

  return event;
}

function userSignupCase(event, user_channel) {
    switch (user_channel.toLowerCase()) {
    case "web".toLowerCase():
      event.event = `registration_web`;
      break;
    case "ios".toLowerCase():
    case "android".toLowerCase():
    default:
      event.event = `registration_app`;
      break;
  }

  return event;
}

function userLoginCase(event, user_channel) {
  switch (user_channel.toLowerCase()) {
    case "web".toLowerCase():
      event.event = `login_success_web`;
      break;
    case "ios".toLowerCase():
    case "android".toLowerCase():
    default:
      event.event = `login_success_app`;
      break;
  }
  return event;
}

function paymentFailureCase(event, service) {
  if (service === "recharge") {
    event.event = `wallet_recharge_failure`
  } else if (service === "puja"){
    event.event = `puja_booking_failure`;
  }
}

function backArrowPaymentFailureCase(event, name) {
  if (name ===  "wallet") {
    event.event = `wallet_recharge_failure`
  } else if (name ===  "puja_detail") {
    event.event = `puja_booking_failure`;
  }
}

function selectPackagePujaStepCase(event, user_channel) {
  switch (user_channel.toLowerCase()) {
    case "web".toLowerCase():
      event.event = `puja_package_selected`;
      break;
    case "ios".toLowerCase():
    case "android".toLowerCase():
    default:
      event.event = `puja_package_selected_app`;
      break;
  }
  return event;
}

function sankalpAndCheckoutPujaStepCase(event, user_channel) {
  switch (user_channel.toLowerCase()) {
    case "web".toLowerCase():
      event.event = `sankalp_filled`;
      break;
    case "ios".toLowerCase():
    case "android".toLowerCase():
    default:
      event.event = `sankalp_filled_app`;
      break;
  }
  return event;
}
