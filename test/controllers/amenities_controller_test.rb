require 'test_helper'

class AmenitiesControllerTest < ActionDispatch::IntegrationTest
  test "should get show" do
    get amenities_show_url
    assert_response :success
  end

  test "should get index" do
    get amenities_index_url
    assert_response :success
  end

  test "should get new" do
    get amenities_new_url
    assert_response :success
  end

  test "should get edit" do
    get amenities_edit_url
    assert_response :success
  end

end
