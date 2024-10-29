import React, { useState, useRef } from 'react';
import 'tabulator-tables/dist/css/tabulator_materialize.min.css'; // Import Tabulator stylesheet
import { ReactTabulator } from 'react-tabulator';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField, Button, CircularProgress, Backdrop, Typography } from '@mui/material';
import dayjs from 'dayjs';

function App() {



    const [startDate, setStartDate] = useState(dayjs('2024-01-01T00:00:00.000Z'));
    // const [startDate, setStartDate] = useState(dayjs('2024-10-01T00:00:00.000Z'));
    const [repairOrders, setRepairOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    let tableRef = useRef(null)

    console.log(startDate)

    const getShopWareData = async () => {

        console.log("Getting Shopware Data")

        // Reset repair orders to be empty
        setRepairOrders([])

        // Import the partnerId from the .env file
        const partnerId = import.meta.env.VITE_partner_id
        const secret = import.meta.env.VITE_secret
        const tenantId = import.meta.env.VITE_tenant_id

        const fetchAllPages = async (page = 1, accumulatedResults = []) => {
            try {
                const fetchUrl = `/api/api/v1/tenants/${tenantId}/repair_orders?per_page=100&closed_after=${startDate.toISOString()}&page=${page}&associations[]=customer&associations[]=payments`
                console.log("Fetching...", fetchUrl)
                const response = await fetch(fetchUrl, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Api-Partner-Id": partnerId,
                        "X-Api-Secret": secret,
                        "Accept": "application/json"
                    }
                });

                // This data includes items which haven't been paid for.
                const data = await response.json();

                console.log(data)

                // Filter data.results down to only ones where the data.results.payments array is not empty
                const filteredData = data.results.filter((result) => result.payments.length > 0);

                // Add a property to each result that is the sum of the .amount_cents on each result.payments[].amount_cents
                filteredData.forEach((result) => {
                    result.total_amount_cents = result.payments.reduce((sum, payment) => sum + payment.amount_cents, 0);
                });

                const newResults = accumulatedResults.concat(filteredData);

                setTotalPages(data.total_pages)

                if (page < data.total_pages) {
                    setCurrentPage(page + 1)
                    return fetchAllPages(page + 1, newResults);
                } else {
                    return newResults;
                }

            } catch (error) {
                console.log(error);
                return accumulatedResults;
            }
        };

        setLoading(true)
        const results = await fetchAllPages();
        console.log("Repair Orders:", results)
        setRepairOrders(results);
        setLoading(false)

    };
    const columns = [
        { title: "Closed At", field: "closed_at" },
        { title: "Customer Id", field: "customer_id" },
        { title: "Customer First Name", field: "customer.first_name" },
        { title: "Customer Last Name", field: "customer.last_name" },
        { title: "Customer Address", field: "customer.address" },
        // { title: "Customer Detail", field: "customer.detail" },
        { title: "Customer City", field: "customer.city" },
        { title: "Customer State", field: "customer.state" },
        { title: "Customer Zip", field: "customer.zip" },
        { title: "Marketing OK", field: "customer.marketing_ok" },
        { title: "Total Paid", field: "total_amount_cents" },
    ];

    const handleDownload = () => {
        console.log(tableRef)
        if (tableRef.current) {
            tableRef.current.download("csv", "repair_orders.csv");
        }
    }

    return (
        <div className="App">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                        sx={{ m: 2 }}
                        label="Start Date"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        renderInput={(params) => <TextField {...params} />}
                    />
                </LocalizationProvider>
                <Button variant="contained" onClick={() => getShopWareData()} style={{ marginLeft: '10px' }}>
                    Get Shopware Data...
                </Button>
                <Button variant="contained" onClick={handleDownload} style={{ marginLeft: '10px' }}>
                    Download
                </Button>
            </div>
            <ReactTabulator
                onRef={(r) => (tableRef = r)}
                columns={columns}
                data={repairOrders}
                layout={"fitData"}
                options={{
                    pagination: "local",
                    paginationSize: 100,
                    downloadDataFormatter: (data) => data,
                    downloadReady: (fileContents, blob) => blob,
                }}
            />
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, display: 'flex', flexDirection: 'column' }}
                open={loading}
            >
                <CircularProgress color="inherit" />
                <Typography variant="h6" color="inherit" sx={{ mt: 5 }}>
                    Getting page {currentPage} of {totalPages}...
                </Typography>

            </Backdrop>
        </div>
    );
}

export default App;
