import csv
import random
import uuid
from web3 import Web3

# Generate 1000 random Ethereum addresses
def generate_eth_addresses(num_addresses):
    eth_addresses = []
    for _ in range(num_addresses):
        eth_address = Web3.to_checksum_address(Web3.sha3(text=str(uuid.uuid4().hex))[-40:])
        eth_addresses.append(eth_address)
    return eth_addresses

# Generate random UUIDs
def generate_uuids(num_uuids):
    uuids = [str(uuid.uuid4()) for _ in range(num_uuids)]
    return uuids

# Generate random deposit addresses (placeholder)
def generate_deposit_addresses(num_addresses):
    deposit_addresses = [f'0x{"".join(random.choices("0123456789abcdef", k=40))}' for _ in range(num_addresses)]
    return deposit_addresses

# Generate random amounts to payout (placeholder)
def generate_amounts(num_amounts):
    amounts = [random.uniform(0.1, 10) for _ in range(num_amounts)]
    return amounts

# Generate data for CSV file
def generate_csv_data(num_records):
    # eth_addresses = generate_eth_addresses(num_records)
    uuids = generate_uuids(num_records)
    # assets = 'ETH_TEST3'
    deposit_addresses = generate_deposit_addresses(num_records)
    # amounts = '0.01'

    data = []
    for i in range(num_records):
        row = [
            f"Recipient {i+1}",
            uuids[i],
            "ETH_TEST3",
            generate_deposit_addresses[i],
            "0.01"
        ]
        data.append(row)
    return data

# Write data to CSV file
def write_to_csv(filename, data):
    with open(filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['Recipient Display name', 'UUID', 'blockchain asset', 'deposit address', 'amount (to payout)'])
        writer.writerows(data)

if __name__ == "__main__":
    num_records = 1000
    csv_data = generate_csv_data(num_records)
    write_to_csv("eth_addresses.csv", csv_data)
    print("CSV file generated successfully.")
