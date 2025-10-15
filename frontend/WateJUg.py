def water_jug_problem(jug1_capacity, jug2_capacity, target):
    # Initialize jugs
    jug1 = 0
    jug2 = 0
    steps = []

    while True:
        # If target is achieved in either jug
        if jug1 == target or jug2 == target:
            steps.append(f"Result Jug1: {jug1}, Jug2: {jug2}")
            return steps

        # Fill jug1 if empty
        if jug1 == 0:
            jug1 = jug1_capacity
            steps.append(f"PUT Jug1: Jug1: {jug1}, Jug2: {jug2}")
            continue

        # Pour from jug1 to jug2 until jug2 is full or jug1 is empty
        if jug2 < jug2_capacity and jug1 > 0:
            transfer = min(jug1, jug2_capacity - jug2)
            jug2 += transfer
            jug1 -= transfer
            steps.append(f"Transfer from Jug1 to Jug2: Jug1: {jug1}, Jug2: {jug2}")
            continue

        # Empty jug2 if full
        if jug2 == jug2_capacity:
            jug2 = 0
            steps.append(f"Empty Jug2: Jug1: {jug1}, Jug2: {jug2}")
            continue

        # If no solution is possible
        break

    return ["No solution exists"]

# Example usage
if __name__ == "__main__":
    jug1_capacity = 9 # 4-liter jug
    jug2_capacity = 5  # 3-liter jug
    target = 7         # Target amount of water

    steps = water_jug_problem(jug1_capacity, jug2_capacity, target)
    print("\nSteps to solve the Water Jug Problem:")
    for step in steps:
        print(step)