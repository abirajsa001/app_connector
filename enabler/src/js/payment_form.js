/*
 * This script load the payment form on the checkout
 *
 * @author      Novalnet
 * @copyright   Copyright (c) Novalnet
 * @license     https://www.novalnet.de/payment-plugins/kostenlos/lizenz
 *
*/

jQuery(document).ready(function () {
    // Initialize the payment form
    const v13PaymentForm = new NovalnetPaymentForm();

    // Get the payment methods response
	v13PaymentForm.getPayment(
					(data) => {
						if(data.result.status == 'ERROR') {
							console.log('get-payment-error');
							console.log(data);
							return false;
						} else {
							console.log('get-payment-success');
							console.log(data);
							return true;
						}
					}
				)
            
    // Handle wallet payment response
    v13PaymentForm.walletResponse({
        "onProcessCompletion": async (response) =>  {
            if(response.result.status == 'FAILURE' || response.result.status == 'ERROR' ) {
                return {status: 'FAILURE', statusText: 'failure'};
            } else {
                return {status: 'SUCCESS', statusText: 'successful'};
            }
        }
    });
    // receive form selected payment action
    v13PaymentForm.selectedPayment(
        (data)=> {
			console.log('selected-payment');
			console.log(data);
       }
    )
});


