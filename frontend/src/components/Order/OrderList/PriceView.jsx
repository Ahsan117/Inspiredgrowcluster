
import React, { useRef } from 'react';
import { Modal, Card, Table, Divider, Tag, Descriptions, Button } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  PercentageOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  ShareAltOutlined,
  CloseOutlined
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import { useEffect, useState } from 'react';
const PriceBreakdownModal = ({ visible, onClose, order }) => {
   const[address, setAddress] = useState({});

  const contentRef = useRef();

  if (!order) return null;
  console.log('Order data:', order);
  const calculateBreakdown = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let itemDetails = [];

    order.items.forEach(item => {
      const itemSubtotal = item.salesPrice * item.quantity;
      const itemDiscount = item.discount || 0;
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;

      const itemTax = ((itemSubtotal - itemDiscount) * ((order.tax || 0) / 100));
      itemDetails.push({
        ...item,
        itemTotal: itemSubtotal,
        itemTax,
        finalPrice: itemSubtotal - itemDiscount + itemTax,
      });
    });

    const totalTax = itemDetails.reduce((sum, item) => sum + item.itemTax, 0);
    const grandTotal = subtotal - totalDiscount + totalTax + (order.shippingFee || 0);

    return {
      itemDetails,
      subtotal,
      totalTax,
      totalDiscount,
      grandTotal,
    };
  };

  const breakdown = calculateBreakdown();

  const columns = [
    {
      title: 'Item',
      dataIndex: ['item', 'name'],
      key: 'itemName',
      render: (_, record) => (
        <div>{record.item?.itemName || 'Unnamed Item'}</div>
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render:  (_,record) => `${record.item.salesPrice?.toFixed(2)}`,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
    },
    {
      title: 'Discount',
      dataIndex: 'discount',
      key: 'discount',
      align: 'right',
      render: discount => discount > 0 ? (
        <Tag color="orange">-{discount.toFixed(2)}</Tag>
      ) : '0',
    },
    {
      title: 'Tax',
      dataIndex: 'itemTax',
      key: 'tax',
      align: 'right',
      render: tax => `${tax.toFixed(2)}`,
    },
    {
      title: 'Total',
      dataIndex: 'finalPrice',
      key: 'total',
      align: 'right',
      render: total => <span className="font-medium">{total.toFixed(2)}</span>,
    },
  ];

  const handlePrint = () => {
    const content = contentRef.current;
    const printWindow = window.open('', '', 'width=900,height=650');
    printWindow.document.write(`<html><head><title>Print Order</title></head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleExportPDF = async () => {
    const canvas = await html2canvas(contentRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`order_${order.orderId}.pdf`);
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      title={
        <div className="flex items-center justify-between">
          <span><ShoppingCartOutlined className="mr-2" />Order #{order.orderId}</span>
          <Tag color="blue">{order.status}</Tag>
        </div>
      }
    >
      <div ref={contentRef}>
        <Card bordered={false}>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Order Time">
              {new Date(order.orderTime).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Customer">
              {order.customer?.name || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Method">
              <Tag color="purple">{order.paymentMethod}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Payment Status">
              <Tag color={order.paymentStatus === "Completed" ? "green" : "red"}>
                {order.paymentStatus}
              </Tag>
            </Descriptions.Item>
            {order.couponCode && (
              <Descriptions.Item label="Coupon Code">
                <Tag color="orange">{order.couponCode}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider orientation="left"><ShoppingCartOutlined className="mr-2" />Items Breakdown</Divider>

          <Table
            columns={columns}
            dataSource={breakdown.itemDetails}
            rowKey={(_, idx) => idx}
            pagination={false}
            size="middle"
            className="mb-6"
          />

          <Divider orientation="left"><DollarOutlined className="mr-2" />Price Summary</Divider>

          <div className="price-summary-grid">
            <div className="price-summary-col">
              <div className="price-row"><span>Subtotal:</span><span>{order.subtotal.toFixed(2)}</span></div>
              <div className="price-row"><span>Item Discounts:</span><span>-{breakdown.totalDiscount.toFixed(2)}</span></div>
              <div className="price-row"><span>Tax:</span><span>{breakdown.totalTax.toFixed(2)}</span></div>
            </div>
            <div className="price-summary-col">
              <div className="price-row"><span>Processing Fee:</span><span>{(order.processingFee || 0).toFixed(2)}</span></div>
              <div className="price-row"><span>Shipping Fee:</span><span>{(order.shippingFee || 0).toFixed(2)}</span></div>
              <div className="mt-2 text-lg font-semibold price-row"><span>Total:</span><span>{order.totalAmount.toFixed(2)}</span></div>
            </div>
          </div>

          <Divider orientation="left"><PercentageOutlined className="mr-2" />Shipping Address</Divider>
          <div className="text-sm">
            {order.shippingAddress && (
              <div>
                {order.shippingAddress[0].houseNo}, {order.shippingAddress[0].area},<br />
                {order.shippingAddress[0].city}, {order.shippingAddress[0].state}, {order.shippingAddress[0].country} - {order.shippingAddress[0].postalCode}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Divider />

      <div className="flex justify-end gap-2 mt-4">
        <Button icon={<FilePdfOutlined />} onClick={handleExportPDF}>Export PDF</Button>
        <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
        <Button type="primary" onClick={onClose}>Close</Button>
      </div>

      <style jsx>{`
        .price-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
      `}</style>
    </Modal>
  );
};

export default PriceBreakdownModal;
