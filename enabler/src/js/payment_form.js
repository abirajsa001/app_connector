const v13PaymentForm = new NovalnetPaymentForm();

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
		

v13PaymentForm.walletResponse({
	"onProcessCompletion": async (response) =>  {
		if(response.result.status == 'FAILURE' || response.result.status == 'ERROR' ) {
			return {status: 'FAILURE', statusText: 'failure'};
		} else {
			return {status: 'SUCCESS', statusText: 'successful'};
		}
	}
});

v13PaymentForm.selectedPayment(
	(data)=> {
		console.log('selected-payment');
		console.log(data);
   }
)



