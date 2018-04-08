require 'test_helper'

class ListingAmenitiesControllerTest < ActionDispatch::IntegrationTest
  test "should get show" do
    get listing_amenities_show_url
    assert_response :success
  end

  test "should get index" do
    get listing_amenities_index_url
    assert_response :success
  end

end
