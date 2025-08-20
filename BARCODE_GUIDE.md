# Barcode Scanner Guide for KIT Canteen

## How the Barcode System Works

### Order Process
1. **Customer places order** → Order gets a unique order number (e.g., `ORD1754331701447`)
2. **System generates delivery barcode** → Unique barcode for pickup verification (e.g., `KC701981PP1KSG`)
3. **Customer receives order confirmation** → Contains both order number and delivery barcode
4. **Canteen staff scan delivery barcode** → For order fulfillment verification

### Two Types of Codes

#### Order Number (ORD format)
- **Format**: `ORD1754331701447`
- **Purpose**: Order tracking and identification
- **Used for**: Customer reference, order management, status checking

#### Delivery Barcode (Order Number)
- **Format**: `ORD1754331477327`
- **Purpose**: Order pickup verification and delivery confirmation
- **Used for**: Barcode scanning at pickup counter

### Scanner Usage Instructions

#### For Canteen Staff:
1. **Access Scanner**: Click the "Scanner" tab in your dashboard
2. **Start Camera Scanner**: Click "Start Camera Scanner" button
3. **Allow Camera Permission**: Grant camera access when prompted
4. **Scan Delivery Barcode**: Point camera at the delivery barcode (not order number)
5. **Verify Delivery**: System automatically processes and marks order as delivered

#### What Happens When You Scan:
- ✅ **Valid unused barcode**: Order marked as delivered, customer notified
- ❌ **Already used barcode**: "Order has already been delivered" message
- ❌ **Invalid barcode**: "Invalid barcode. No order found" message
- ❌ **Order not ready**: "Order is not ready for pickup" message

### Troubleshooting

#### If scanning fails:
1. Use **Manual Entry**: Type the barcode in the input field
2. Check **Camera Permissions**: Ensure browser has camera access
3. Try **Better Lighting**: Ensure good lighting for camera scanning
4. Use **Correct Barcode**: Scan the delivery barcode, not the order number

#### Common Issues:
- **Scanning Order Number**: Remember to scan the delivery barcode (alphanumeric), not the order number (ORD format)
- **Poor Camera Quality**: Use manual entry as backup
- **Permission Denied**: Enable camera permissions in browser settings

### System Status
✅ Database connected and working
✅ Barcode scanner interface functional
✅ Camera permissions and scanning working
✅ Order delivery verification working
✅ Real-time order status updates working

### Test Examples
#### Example 1:
- Order Number: `ORD1754331701447`
- Delivery Barcode: `KC701981PP1KSG`
- Status: Successfully delivered ✅

#### Example 2:
- Order Number: `ORD1754332914519`
- Delivery Barcode: `KC9150595KMUNH`
- Status: Successfully delivered ✅

### Important Note:
**Now you can use the order number (ORD format) directly as the barcode!**

The system is fully operational and ready for use!