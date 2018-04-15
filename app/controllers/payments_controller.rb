class PaymentsController < ApplicationController
  
   before_action :set_order

  def new
  end

  def create
    # Create a customer on stripe to be charged
    # once its booking is approved.
    customer = Stripe::Customer.create(
      source: params[:stripeToken],
      email:  params[:stripeEmail]
    )
    binding.pry
    @booking.update(stripe_token: customer.sources.data.first.customer)
    redirect_to listing_booking_path(listing_id:@booking.listing.id,id: @booking)
    
    rescue Stripe::CardError => e
      flash[:alert] = e.message
      redirect_to new_listing_booking_payment_path(listing_id:@booking.listing.id ,id: @booking)
  end

  private

  def set_order
    @booking = current_user.bookings.find(params[:booking_id])
  end
  
end
