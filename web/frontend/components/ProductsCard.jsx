import { useState, useEffect } from "react";
import { Card, TextContainer, Text, Layout, LegacyCard, TextField, FormLayout, Banner, Modal, Button } from "@shopify/polaris";
import { Toast } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";

export function ProductsCard() {
  const emptyToastProps = { content: null };
  const [isLoading, setIsLoading] = useState(true);
  const [toastProps, setToastProps] = useState(emptyToastProps);
  const [carrierData, setCarrierData] = useState([]); // State to store the fetched data array
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fetch = useAuthenticatedFetch();
  const { t } = useTranslation();
  const productsCount = 5;

  const {
    data,
    refetch: refetchProductCount,
    isLoading: isLoadingCount,
    isRefetching: isRefetchingCount,
  } = useAppQuery({
    url: "/api/products/count",
    reactQueryOptions: {
      onSuccess: () => {
        setIsLoading(false);
      },
    },
  });

  useEffect(() => {
    fetchCarrier();
  }, []); 

  const toastMarkup = toastProps.content && !isRefetchingCount && (
    <Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
  );

  const handlePopulate = async () => {
    setIsLoading(true);
    const response = await fetch("/api/products/create");

    if (response.ok) {
      await refetchProductCount();
      setToastProps({
        content: t("ProductsCard.productsCreatedToast", {
          count: productsCount,
        }),
      });
    } else {
      setIsLoading(false);
      setToastProps({
        content: t("ProductsCard.errorCreatingProductsToast"),
        error: true,
      });
    }
  };

  const fetchCarrier = async () => {
    try {
      const response = await fetch("/api/carrier-service");
      const responseData = await response.json();
      console.log(responseData.data);
      setCarrierData(responseData.data); 
    } catch (err) {
      console.log(err);
    }
  };

  const handleModalOpen = () => {
    setIsModalOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setName("");
    setCallbackUrl("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCreateCarrier = async () => {
    const carrierExists = carrierData.some((item) => item.name === name);
  
    if (carrierExists) {
      setErrorMessage("A carrier service already exists");
    } else {
      try {
        const response = await fetch("/api/carrier-service", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name,
            callbackUrl: callbackUrl,
            service_discovery: true,
          }),
          
        });
  
        if (response.ok) {
          // Success: Update success message and perform any additional logic
          setSuccessMessage(`Your ${name} Carrier Service is created on CallbackURL ${callbackUrl}`);
          // Close the modal and reset input values
          handleModalClose();
        } else {
          // Error: Display error message
          setErrorMessage(`Your ${name} Carrier Service is created on CallbackURL ${callbackUrl}`);
        }
      } catch (err) {
        console.log(err);
        setErrorMessage("An error occurred while creating the carrier service");
      }
    }
  };
  

  return (
    <>
      {toastMarkup}
      <Layout>
        <Layout.AnnotatedSection
          id="storeDetails"
          title="Carrier Service Details"
          description="This is a Custom Carrier Service "
        >
          <LegacyCard
            sectioned
            primaryFooterAction={{
              content: t("Create New Carrier", {
                count: productsCount,
              }),
              onAction: handleModalOpen,
              loading: isLoading,
            }}
          >
            <FormLayout>
              {carrierData.map((item) => (
                <div key={item.id}>
                  <TextField
                    label="Carrier Service ID"
                    placeholder={item.id}
                    disabled
                  />
                  <TextField
                    type="email"
                    label="Carrier Service Name"
                    placeholder={item.name}
                    disabled
                  />
                </div>
              ))}
            </FormLayout>
          </LegacyCard>
        </Layout.AnnotatedSection>
      </Layout>

      <Modal
        open={isModalOpen}
        onClose={handleModalClose}
        title="Create Carrier Service"
        primaryAction={{
          content: "Create",
          onAction: handleCreateCarrier,
          disabled: !!errorMessage, 
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleModalClose,
          },
        ]}
      >
        {errorMessage && <Banner status="success">{errorMessage}</Banner>} 
        <Modal.Section>
          <TextField
            label="Name"
            value={name}
            onChange={setName}
            placeholder="Enter carrier service name"
          />
          <TextField
            label="Callback URL"
            value={callbackUrl}
            onChange={setCallbackUrl}
            placeholder="Enter callback URL"
          />
        </Modal.Section>
      </Modal>

      {successMessage && (
        <Layout>
          <Layout.Section>
            <Card>
              <TextContainer>
                <Text>{successMessage}</Text>
              </TextContainer>
            </Card>
          </Layout.Section>
        </Layout>
      )}
    </>
  );
}
