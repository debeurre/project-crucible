export class Stock {
    private inventory: Map<string, number>;
    private capacity: number;

    constructor(capacity: number = Infinity) {
        this.inventory = new Map();
        this.capacity = capacity;
    }

    public add(type: string, amount: number): boolean {
        const currentTotal = this.getTotal();
        if (currentTotal + amount > this.capacity) {
            return false;
        }

        const current = this.inventory.get(type) || 0;
        this.inventory.set(type, current + amount);
        return true;
    }

    public remove(type: string, amount: number): boolean {
        const current = this.inventory.get(type) || 0;
        if (current < amount) {
            return false;
        }

        this.inventory.set(type, current - amount);
        return true;
    }

    public count(type: string): number {
        return this.inventory.get(type) || 0;
    }

    public getTotal(): number {
        let total = 0;
        for (const amount of this.inventory.values()) {
            total += amount;
        }
        return total;
    }

    public get capacityLimit(): number {
        return this.capacity;
    }

    public toJSON() {
        return {
            capacity: this.capacity,
            inventory: Array.from(this.inventory.entries())
        };
    }

    public static deserialize(data: any): Stock {
        const stock = new Stock(data.capacity);
        if (data.inventory) {
            stock.inventory = new Map(data.inventory);
        }
        return stock;
    }
}
