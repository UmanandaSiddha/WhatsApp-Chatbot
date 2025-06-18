import { Query } from "mongoose";

class ApiFeatures<T> {
    private query: Query<T[], T>;
    private queryStr: Record<string, any>;

    constructor(query: Query<T[], T>, queryStr: Record<string, any>) {
        this.query = query;
        this.queryStr = queryStr;
    }

    public getQuery(): Query<T[], T> {
        return this.query;
    }

    search(): this {
        const keyword = this.queryStr.keyword
            ? {
                $or: [
                    { "phoneNumber": { $regex: this.queryStr.keyword, $options: "i" } },
                    { "firstName": { $regex: this.queryStr.keyword, $options: "i" } },
                    { "lastName": { $regex: this.queryStr.keyword, $options: "i" } },
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $concat: ["$firstName", " ", "$lastName"] },
                                regex: this.queryStr.keyword,
                                options: "i",
                            },
                        },
                    },
                ],
            }
            : {};

        this.query = this.query.find({ ...keyword });
        return this;
    }

    filter(): this {
        const queryCopy = { ...this.queryStr };

        const removeFields = ["keyword", "page", "limit"];
        removeFields.forEach((key) => delete queryCopy[key]);

        let queryStr = JSON.stringify(queryCopy);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (key) => `$${key}`);

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    pagination(resultPerPage: number): this {
        const currentPage = Number(this.queryStr.page) || 1;
        const skip = resultPerPage * (currentPage - 1);

        this.query = this.query.limit(resultPerPage).skip(skip);
        return this;
    }
}

export default ApiFeatures;