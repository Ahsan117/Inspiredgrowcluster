import React, { useState ,useEffect} from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Divider,
  notification,
  Modal
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  EditOutlined,
  CloseOutlined
} from '@ant-design/icons';
import axios from 'axios';

const CustomerProfile = ({ customerData, visible, onClose }) => {
  const [customer, setCustomer] = useState(customerData);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({});
  const handleStatusToggle = async () => {
    try {
      setLoading(true);
      const newStatus = customer.status === 'active' ? 'inactive' : 'active';

      const response = await axios.patch(`https://pos.inspiredgrow.in/vps/customers/${customer._id}`, {
        status: newStatus
      });

      setCustomer({
        ...customer,
        status: newStatus
      });

      notification.success({
        message: 'Status Updated',
        description: `Customer status changed to ${newStatus}`
      });
    } catch (error) {
      notification.error({
        message: 'Update Failed',
        description: error.response?.data?.message || 'Failed to update status'
      });
    } finally {
      setLoading(false);
    }
  };
   
   useEffect(()=>{
     const fetchAddress = async () => {
      try {
        const response = await axios.get(`https://pos.inspiredgrow.in/vps/api/addresses/admin/all`,
          {
               headers:{
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
          }
        );
        const addressData = response.data.data.find(address => address.user?._id === customer._id);
        setAddress(addressData || {});
        console.log('Address Data:', response.data);
      } catch (error) {
        console.error('Error fetching customer data:', error);
      }
    };
    fetchAddress();
  },[])

  const statusTag = {
    active: <Tag color="green">Active</Tag>,
    inactive: <Tag color="red">Inactive</Tag>,
    pending: <Tag color="orange">Pending</Tag>,
    suspended: <Tag color="volcano">Suspended</Tag>
  };

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      width={800}
      bodyStyle={{
        backgroundColor: 'transparent',
        boxShadow: 'none',
        padding: 0
      }}
    >
      <div className="relative">
        {/* Close Button */}
        <Button
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10
          }}
          shape="circle"
        />

        <Card
          title={
            <div className="flex items-center justify-between">
              <span>
                <UserOutlined className="mr-2" />
                Customer Profile
              </span>
             
            </div>
          }
          style={{ borderRadius: '10px' }}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <div>
              <Descriptions title="Basic Information" column={1}>
                <Descriptions.Item label="Customer ID">
                  {customer._id || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Name">
                  {customer.name}
                </Descriptions.Item>
               
                <Descriptions.Item label="Join Date">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Contact Information */}
            <div>
              <Descriptions title="Contact Information" column={1}>
                <Descriptions.Item label={<><MailOutlined /> Email</>}>
                  {customer.email || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label={<><PhoneOutlined /> Phone</>}>
                  {customer.mobile || customer.phone || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label={<><EnvironmentOutlined /> Address</>}>
                  {address ? (
                    <>
                     {address.houseNo && `${address.houseNo}, `}
                      {address.area && `${address.area}, `}
                      {address.city && `${address.city}, `}
                      {address.state && `${address.state}, `}
                      {address.postalCode && `${address.postalCode}`}
                    </>
                  ) : 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>

          <Divider />

          {/* Additional Information */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <h3 className="font-semibold">Account Details</h3>
              <p>Credit Limit: Rs.{customer.creditLimit?.toFixed(2) || '0.00'}</p>
              <p>Previous Due: Rs.{customer.previousDue?.toFixed(2) || '0.00'}</p>
              <p>Price Level: {customer.priceLevelType || 'Standard'}</p>
            </div>

            <div>
              <h3 className="font-semibold">Tax Information</h3>
              <p>GST Number: {customer.gstNumber || 'N/A'}</p>
              <p>PAN Number: {customer.panNumber || 'N/A'}</p>
              <p>Tax Number: {customer.taxNumber || 'N/A'}</p>
            </div>

            <div>
              <h3 className="font-semibold">Shipping Information</h3>
              {customer.shippingAddress ? (
                <>
                  <p>
                    {customer.shippingAddress.houseNo && `${customer.shippingAddress.houseNo}, `}
                    {customer.shippingAddress.area && `${customer.shippingAddress.area}, `}
                    {customer.shippingAddress.city && `${customer.shippingAddress.city}`}
                  </p>
                  <p>
                    {customer.shippingAddress.state && `${customer.shippingAddress.state}, `}
                    {customer.shippingAddress.postalCode && `${customer.shippingAddress.postalCode}`}
                  </p>
                  {customer.shippingAddress.locationLink && (
                    <a
                      href={customer.shippingAddress.locationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500"
                    >
                      View on Map
                    </a>
                  )}
                </>
              ) : <p>Same as billing address</p>}
            </div>
          </div>

          <Divider />

          {/* Customer Image/Attachments
          {customer.customerImage && (
            <div>
              <h3 className="font-semibold">Customer Image</h3>
              <img
                src={`uploads/${customer.customerImage}`}
                alt="Customer"
                className="object-cover w-32 h-32 border rounded-md"
              />
            </div>
          )} */}
        </Card>
      </div>
    </Modal>
  );
};

export default CustomerProfile;
