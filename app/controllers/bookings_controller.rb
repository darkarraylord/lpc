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
  
    if @booking.date_overlaps?(@listing.id) || @booking.date_between?(@listing.id)
      flash.now[:alert] = "The dates you've selected are already booked. Please select other dates." 
      render :new
    elsif @booking.save
      flash.now[:sucess]  =  "Congratulations, you have booked  #{@listing.name}. Once approved we will email you."
      redirect_to listing_booking_path(listing_id: params[:listing_id], id: @booking) 
    else
      flash.now[:alert] = "We were not able to create this booking.Please contact at: ....."
      render :new
    end
  end

  def edit
    @listing = Listing.find(params[:listing_id])
    @booking = Booking.find(params[:id])
  end
  
  def update
    @booking = Booking.find(params[:id])
    if @booking.update(booking_params)
      flash.now[:success] = "Booking updated with success!"
      redirect_to listing_booking_path(listing_id: params[:listing_id], id: @booking)
    else
      redirect_back fallback_location: root_path, alert: "The dates you've selected are already booked. Please select other dates."
    end
  end
  
  private
  def booking_params
    params.require(:booking).permit(:checkin, :checkout, :listing, :status, :introduction)
  end
end
