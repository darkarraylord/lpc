class ListingsController < ApplicationController
  authorize @booking
  def index
    @listings = policy_scope(current_user.listings).order(created_at: :desc)
  end

  def show
    @listing = Listing.find(params[:id])
  end

  def new
    @listing = Listing.new
  end
  
  def create
    @listing = Listing.new(listing_params)
    @listing.user = current_user
    if @listing.save
      redirect_to listing_path(@listing)
    else
      render :new
    end
  end

  def edit
    @listing = Listing.find(params[:id])
  end
  
  def update
    @listing = Listing.find(params[:id])
    @listing.update(listing_params)
    redirect_to listing_path(@listing)
  end

  def destroy
    @listing = Listing.find(params[:id])
    @listing.destroy
    redirect_to listing_path
  end
  
  private
  
  def listing_params
    params.require(:listing).permit(:name, :rate)
  end
end
