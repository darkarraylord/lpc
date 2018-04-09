class BookingsController < ApplicationController
  def index
    @bookings = current_user.bookings
  end
  def show
    @booking = Booking.find(params[:id])
  end
  
  def new 
    @listing = Listing.find(params[:listing_id])
    @booking = Booking.new
  end
  
  def create
    @listing = Listing.find(params[:listing_id])
    @booking = @listing.bookings.new(booking_params)
    @booking.user = current_user
    @booking.status = "pending"
    if @booking.save
      flash[:success] = "Congratulations, you have booked  #{@listing.name}. Once approved we will email you."
      redirect_to listing_booking_path(listing_id: params[:listing_id], id: @booking)
    else
      flash[:error] = "We were not able to create this booking."
      render :new
    end
  end

  def edit
    @listing = Listing.find(params[:listing_id])
    @booking = Booking.find(params[:id])
  end
  
  def update
    @booking = Booking.find(params[:id])
    @booking.update(booking_params)
    flash[:success] = "Booking updated with success!"
    redirect_to listing_booking_path(listing_id: params[:listing_id], id: @booking)
  end
  
  private
  def booking_params
    params.require(:booking).permit(:checkin, :checkout, :listing, :status)
  end
end
